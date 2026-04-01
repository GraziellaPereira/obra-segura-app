// Imports React: hooks para estado, efeitos, refs e callbacks
import { useCallback, useEffect, useRef, useState } from 'react';
// Imports TensorFlow.js e MobileNet: modelos de IA para embeddings e detecção
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as tf from '@tensorflow/tfjs';
import HelmetGuidePage from './HelmetGuidePage';
import GogglesGuidePage from './GogglesGuidePage';
import TalabarteGuidePage from './TalabarteGuidePage';
import TravaQuedasGuidePage from './TravaQuedasGuidePage';

// Limite máximo de imagens de referência que o usuário pode carregar
const MAX_REFERENCE_IMAGES = 5;
// Threshold de similaridade: acima disso (57%), considera-se andaime detectado
const ANDAIME_SIMILARITY_THRESHOLD = 0.57;
// Estratégia 2: descarta comparações muito fracas antes da agregação
const MIN_VALID_REFERENCE_SIMILARITY = 0.5;
// Estratégia 3: suaviza ruído com média móvel dos últimos frames
const SIMILARITY_SMOOTHING_WINDOW = 4;
// Melhor qualidade de captura para reduzir aparência "embaçada"
const CAMERA_WIDTH_IDEAL = 1920;
const CAMERA_HEIGHT_IDEAL = 1080;
const CAMERA_WIDTH_MIN = 1280;
const CAMERA_HEIGHT_MIN = 720;
const CAMERA_FRAME_RATE = 24;
const INFERENCE_INTERVAL_MS = 450;
// Array de objetos de proteção (EPIs) disponíveis na app
// Cada objeto tem id único, label exibido e classe CSS do cubo 3D
const PPE_OBJECTS = [
  {
    id: 'helmet',
    label: 'Capacete',
    cubeClassName: 'cube-yellow',
  },
  {
    id: 'belt',
    label: 'Cinto de seguranca',
    cubeClassName: 'cube-red',
  },
  {
    id: 'lanyard',
    label: 'Talabarte',
    cubeClassName: 'cube-blue',
  },
  {
    id: 'fall-arrest',
    label: 'Trava-quedas',
    cubeClassName: 'cube-green',
  },
];

// Normaliza um vetor de embeddings para que tenha magnitude 1
// Necessário para calcular similaridade de cosseno corretamente
function normalizeVector(values) {
  // Calcula a norma euclidiana (tamanho do vetor)
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  // Se norm é 0, retorna o vetor original para evitar divisão por zero
  if (!norm) {
    return values;
  }
  // Divide cada elemento pela norma para normalizar
  return values.map((value) => value / norm);
}

// Calcula similaridade de cosseno entre dois vetores normalizados
// Retorna valor entre 0 e 1: 1 = idênticos, 0 = completamente diferentes
function cosineSimilarity(vectorA, vectorB) {
  // Validação: vetores devem ter mesmo tamanho e não vazios
  if (vectorA.length !== vectorB.length || !vectorA.length) {
    return 0;
  }
  // Produto escalar dos dois vetores
  let dot = 0;
  for (let i = 0; i < vectorA.length; i += 1) {
    dot += vectorA[i] * vectorB[i];
  }
  // Como os vetores já estão normalizados, o produto escalar = similaridade
  return dot;
}

// Carrega um arquivo de imagem e retorna um objeto Image HTML
// Necessário para extrair embeddings de imagens de referência
function readImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Quando a imagem carrega com sucesso, resolve a promise
    image.onload = () => resolve(image);
    // Se houver erro, rejeita com mensagem descritiva
    image.onerror = () => reject(new Error(`Falha ao carregar imagem: ${file.name}`));
    // Converte o File em URL para servir como src da imagem
    image.src = URL.createObjectURL(file);
  });
}

function averageAndNormalizeEmbeddings(embeddings) {
  const validEmbeddings = embeddings.filter(Boolean);

  if (!validEmbeddings.length) {
    return null;
  }

  if (validEmbeddings.length === 1) {
    return normalizeVector(validEmbeddings[0]);
  }

  const vectorLength = validEmbeddings[0].length;
  const summedVector = new Array(vectorLength).fill(0);

  for (const embedding of validEmbeddings) {
    for (let index = 0; index < vectorLength; index += 1) {
      summedVector[index] += embedding[index];
    }
  }

  const averagedVector = summedVector.map((value) => value / validEmbeddings.length);
  return normalizeVector(averagedVector);
}

function aggregateSimilarities(similarities) {
  if (!similarities.length) {
    return 0;
  }

  const sorted = [...similarities].sort((a, b) => b - a);
  const maxScore = sorted[0];
  const topCount = Math.min(3, sorted.length);
  const topMean = sorted.slice(0, topCount).reduce((sum, value) => sum + value, 0) / topCount;

  // Dá mais peso ao melhor match, mas mantém estabilidade com os top-N.
  return 0.8 * maxScore + 0.2 * topMean;
}

export default function App() {
  // === REFS (referências persistentes entre renders) ===
  // Ref para acessar o elemento <video> da câmera
  const videoRef = useRef(null);
  // Ref para armazenar o modelo MobileNet carregado
  const embeddingModelRef = useRef(null);
  // Ref para armazenar embeddings (vetores) das imagens de referência carregadas
  const referenceEmbeddingsRef = useRef([]);
  // Ref para controlar o ID do requestAnimationFrame (permite cancelar o loop)
  const animationFrameRef = useRef(null);
  // Ref para armazenar o stream da câmera (permite parar as tracks)
  const streamRef = useRef(null);
  // Ref para rastrear últimi timestamp de log (evita poluir console)
  const lastLogTimeRef = useRef(0);
  // Ref para rastrear último timestamp de inferência (throttle: máx 1 predição a cada 450ms)
  const lastInferenceTimeRef = useRef(0);
  // Flag ref para evitar múltiplas inferências simultâneas
  const isInferenceRunningRef = useRef(false);
  // Flag ref critério: quando true, a detecção está travada (não inferencia mais)
  const detectionLockedRef = useRef(false);
  // Histórico curto de similaridade para suavização temporal (hysteresis)
  const similarityHistoryRef = useRef([]);
  // Callback em ref para reiniciar o loop sem recriar câmera/modelo
  const restartDetectionLoopRef = useRef(null);

  // === STATE (estado visível, disparos React render) ===
  // Mensagem exibida na tela (ex: "Betoneira detectada", "Sem similaridade suficiente")
  const [detectedMessage, setDetectedMessage] = useState('');
  // Flag: cubo 3D deve estar visível?
  const [showArCube, setShowArCube] = useState(false);
  // Flag: detecção travou (usado para estado React e efeitos visuais)
  const [, setDetectionLocked] = useState(false);
  // Score de similaridade atual (entre 0 e 1, exibido em porcentagem)
  const [similarityScore, setSimilarityScore] = useState(0);
  // Índice do objeto EPI selecionado (0=capacete, 1=óculos, ciclina)
  const [selectedObjectIndex, setSelectedObjectIndex] = useState(0);
  // ID da página guia aberta (null=nenhuma, 'helmet'=guia capacete, 'goggles'=guia óculos)
  const [activeGuideId, setActiveGuideId] = useState(null);
  // Mensagem de status no painel de controle (sobre imagens de referência)
  const [referenceMessage, setReferenceMessage] = useState(
    'Carregue ate 5 imagens de andaime para calibrar a deteccao.'
  );
  // Referência rápida ao objeto EPI atual baseado em selectedObjectIndex
  const currentObject = PPE_OBJECTS[selectedObjectIndex];

  // === CALLBACKS (funções memoizadas para evitar re-renders) ===
  
  // Abre a página guia do objeto EPI selecionado
  // Disparado ao clicar no cubo 3D
  const openSelectedGuidePage = useCallback(() => {
    setActiveGuideId(currentObject.id);
  }, [currentObject.id]);

  // Fecha a página guia aberta
  // Disparado ao clicar no botão "Voltar" da guia
  const closeGuidePage = useCallback(() => {
    // Volta para a câmera
    setActiveGuideId(null);

    // Destrava a detecção para recalcular similaridade desde o início.
    detectionLockedRef.current = false;
    setDetectionLocked(false);

    // Limpa estado temporal para evitar viés do ciclo anterior.
    similarityHistoryRef.current = [];
    setSimilarityScore(0);
    setShowArCube(false);
    setDetectedMessage('Deteccao reiniciada. Aponte para o andaime.');

    // Reinicia o loop de predição imediatamente.
    if (restartDetectionLoopRef.current) {
      restartDetectionLoopRef.current();
    }
  }, []);

  // Avança para o próximo objeto EPI (capacete -> óculos -> capacete...)
  // Disparado ao clicar no botão "→" de navegação
  // Funciona MESMO DEPOIS DE TRAVAR A DETECÇÃO (independente da predicão)
  const showNextObject = useCallback(() => {
    setSelectedObjectIndex((previousIndex) =>
      (previousIndex + 1) % PPE_OBJECTS.length
    );
  }, []);

  // Extra embeddings (vetores de features) de um elemento HTML (imagem ou vídeo)
  // Usa MobileNet para gerar um vetor 1024D que representa as características visuais
  const getEmbeddingFromElement = useCallback(async (element) => {
    // Guard: se modelo não carregou, não faz nada
    if (!embeddingModelRef.current) {
      return null;
    }

    async function extractEmbedding(source) {
      // tf.tidy() garante que tensores temporários sejam liberados da memória
      const embeddingTensor = tf.tidy(() => {
        // Converte pixels da imagem em tensor (altura, largura, 3 canais RGB)
        const imageTensor = tf.browser.fromPixels(source).toFloat();
        // Redimensiona para 224x224 (tamanho que MobileNet espera)
        const resized = tf.image.resizeBilinear(imageTensor, [224, 224]);
        // Adiciona dimensão de batch (quantidade de imagens processadas)
        // MobileNet espera entrada com formato: [batch, altura, largura, 3]
        const batched = resized.expandDims(0);
        // Executa o modelo: retorna embedding (vetor de features)
        return embeddingModelRef.current.infer(batched, true);
      });

      const embeddingData = await embeddingTensor.data();
      embeddingTensor.dispose();
      return Array.from(embeddingData);
    }

    // Como o andaime ocupa quase toda a imagem, prioriza o frame completo.
    // Isso reduz ruído de recortes laterais e melhora consistência do embedding.
    const embeddings = [await extractEmbedding(element)];

    return averageAndNormalizeEmbeddings(embeddings);
  }, []);

  // Handler para upload de imagens de referência
  // Essas imagens servem para calibrar a detecção da betoneira
  // Usuário pode enviar até 5 fotos (constante MAX_REFERENCE_IMAGES)
  const handleReferenceUpload = useCallback(async (event) => {
    // Extrai e limita a quantidade de arquivos selecionados
    const selectedFiles = Array.from(event.target.files || []).slice(
      0,
      MAX_REFERENCE_IMAGES
    );

    // Se nenhum arquivo selecionado, sai
    if (!selectedFiles.length) {
      return;
    }

    // Guard: modelo não carregou ainda, informa usuário
    if (!embeddingModelRef.current) {
      setReferenceMessage('Modelo de similaridade ainda nao carregou. Aguarde alguns segundos.');
      return;
    }

    // Informa que está processando
    setReferenceMessage('Processando imagens de referencia...');

    try {
      // Array para armazenar embeddings extraidos de cada imagem
      const embeddings = [];

      // Processa cada imagem de forma sequencial
      for (const file of selectedFiles) {
        // Lê a imagem do arquivo
        const image = await readImageFromFile(file);
        // Extrai embedding da imagem
        const embedding = await getEmbeddingFromElement(image);
        // Libera o URL criado
        URL.revokeObjectURL(image.src);

        // Se conseguiu extrair embedding, armazena
        if (embedding) {
          embeddings.push(embedding);
        }
      }

      // Armazena os embeddings em ref (será usado na detecção)
      referenceEmbeddingsRef.current = embeddings;
      // Limpa histórico ao recalibrar referências para evitar viés antigo
      similarityHistoryRef.current = [];
      // Atualiza mensagem com sucesso
      setReferenceMessage(
        `${embeddings.length} imagem(ns) carregada(s). Similaridade minima: ${Math.round(
          ANDAIME_SIMILARITY_THRESHOLD * 100
        )}%`
      );
    } catch (uploadError) {
      // Log do erro para debug
      console.error('Erro ao processar imagens de referencia:', uploadError);
      // Informa erro ao usuário
      setReferenceMessage('Falha ao carregar imagens. Tente novamente.');
    }
  }, [getEmbeddingFromElement]);

  // === LIFE CYCLE: INICIALIZAÇÃO E LOOP DE DETECÇÃO ===
  // Este efeito roda UMA VEZ na montagem do componente
  // Carrega modelo, inicia câmera e inicia o loop de predicão
  useEffect(() => {
    // Flag para rastrear se o componente ainda está montado
    // Previne state updates após unmount (warning do React)
    let isMounted = true;

    // ====== SCHEDULER ======
    // Agenda a próxima execução de detectObjects
    // Usa requestAnimationFrame para sincronizar com refresh rate do browser
    function scheduleNextDetection() {
      // Se componente foi desmontado, não agenda
      if (!isMounted) {
        return;
      }
      // Agenda detectObjects para executar no próximo frame
      animationFrameRef.current = requestAnimationFrame(detectObjects);
    }

    // ====== UI STATE UPDATER ======
    // Helper que atualiza a UI de forma eficiente
    // Só faz render se o valor mudou (evita re-renders desnecessários)
    function setUiState(newSimilarity, isDetected, message) {
      // Atualiza showArCube: mostra cubo 3D quando detecta, esconde quando não
      setShowArCube((previousValue) =>
        previousValue === isDetected ? previousValue : isDetected
      );
      // Atualiza mensagem exibida: só se mudou
      setDetectedMessage((previousValue) =>
        previousValue === message ? previousValue : message
      );
      // Atualiza score de similaridade (convertido em % na UI)
      // Só muda se a diferença for maior que 1% (0.01)
      setSimilarityScore((previousValue) => {
        if (Math.abs(previousValue - newSimilarity) < 0.01) {
          return previousValue;
        }
        return newSimilarity;
      });
    }

    // ====== DETECTION LOOP ======
    // Função principal que roda a cada frame
    // Compara frame atual com imagens de referência e retorna score de similaridade
    async function detectObjects() {
      // Guard 1: verifica se componente está montado e modelo carregou
      if (!isMounted || !embeddingModelRef.current || !videoRef.current) {
        scheduleNextDetection();
        return;
      }
      
      // Guard 2: TRAVAMENTO - se detecção já travou, sai imediatamente
      // Não processa mais nenhuma inferência
      if (detectionLockedRef.current) return;

      const now = Date.now();

      // ====== THROTTLE ======
      // Limita inferências para não sobrecarregar o navegador/mobile
      // Máximo 1 predicão a cada 450ms (reduz CPU/GPU load)
      if (now - lastInferenceTimeRef.current < INFERENCE_INTERVAL_MS || isInferenceRunningRef.current) {
        // Se não passou tempo suficiente ou já está rodando, só reagenda
        scheduleNextDetection();
        return;
      }

      // ====== INFERÊNCIA - EXTRACTION ======
      // Marca que uma inferência está em progresso
      isInferenceRunningRef.current = true;
      lastInferenceTimeRef.current = now;

      // Similaridade agregada do frame atual
      let bestSimilarity = 0;
      let hasSimilaritySample = false;

      // ====== COMPARAÇÃO - EMBEDDINGS ======
      // Se temos imagens de referência carregadas
      if (referenceEmbeddingsRef.current.length > 0) {
        // Extrai embedding do frame atual da câmera
        const frameEmbedding = await getEmbeddingFromElement(videoRef.current);

        // Se conseguiu extrair, compara com todas as referências
        if (frameEmbedding) {
          const similarities = referenceEmbeddingsRef.current.map((referenceEmbedding) =>
            cosineSimilarity(frameEmbedding, referenceEmbedding)
          );

          // Estratégia 2: remove scores muito baixos (ruído) antes de agregar.
          // Se todas forem baixas, usa todas para não "sumir" com o sinal.
          const validSimilarities = similarities.filter(
            (score) => score >= MIN_VALID_REFERENCE_SIMILARITY
          );
          const similaritiesForAggregation = validSimilarities.length
            ? validSimilarities
            : similarities;

          if (similaritiesForAggregation.length) {
            bestSimilarity = aggregateSimilarities(similaritiesForAggregation);
            hasSimilaritySample = true;
          }
        }
      } else {
        // Sem imagens de referência, não pode detectar
        if (isMounted) {
          setUiState(0, false, 'Envie imagens de referencia para iniciar a deteccao.');
        }
        isInferenceRunningRef.current = false;
        scheduleNextDetection();
        return;
      }

      // Estratégia 3: média móvel para estabilizar decisão entre frames.
      if (hasSimilaritySample) {
        similarityHistoryRef.current.push(bestSimilarity);

        if (similarityHistoryRef.current.length > SIMILARITY_SMOOTHING_WINDOW) {
          similarityHistoryRef.current.shift();
        }

        const smoothedSum = similarityHistoryRef.current.reduce(
          (accumulator, score) => accumulator + score,
          0
        );
        bestSimilarity = smoothedSum / similarityHistoryRef.current.length;
      }

      // ====== DEBUG LOG ======
      // Evita poluir o console logando a cada frame
      // Só loga a cada 1 segundo (1000ms)
      if (now - lastLogTimeRef.current > 1000) {
        console.log('Andaime similarity:', bestSimilarity);
        lastLogTimeRef.current = now;
      }

      // ====== DECISION & LOCKING ======
      if (isMounted) {
        // Verifica se passou do threshold
        const isDetected = bestSimilarity >= ANDAIME_SIMILARITY_THRESHOLD;
        // Flag: detectou AGORA pela PRIMEIRA VEZ (não estava travado)
        const travouAgora = isDetected && !detectionLockedRef.current;

        // ====== TRAVA GEM (primeiro hit) ======
        // Executa UMA Única vez quando bate o threshold
        if (travouAgora) {
          // Marca ref como travado (para guards nas iterações futuras)
          detectionLockedRef.current = true;
          // Atualiza estado para re-render (possíveis efeitos visuais)
          setDetectionLocked(true);
          // Garante que o cubo 3D fica visível permanentemente
          setShowArCube(true);
          // Mensagem fixa de sucesso
          setDetectedMessage('Andaime detectado. Selecao 3D fixa.');
        }
        
        // ====== EXIT EARLY (após travar) ======
        // Se acabou de travar, não executa o resto (evita setUiState conflitante)
        if (travouAgora) {
          isInferenceRunningRef.current = false;
          return; // Para esta execução de detectObjects
        }
        
        // ====== UI UPDATE (apenas quando NÃO travado) ======
        // Monta mensagem para exibir
        const message = isDetected
          ? `Andaime detectado por similaridade (${Math.round(bestSimilarity * 100)}%)`
          : 'Sem similaridade suficiente com as referencias.';

        // Atualiza UI com novo score e status (reage à detectação dinâmica)
        setUiState(bestSimilarity, isDetected, message);
      }

      // ====== SCHEDULER (reinicia loop se NÃO travado) ======
      isInferenceRunningRef.current = false;
      // Só agenda próximo frame se detecção não está travada
      // AQUI está a "morte" do loop requestAnimationFrame
      if (!detectionLockedRef.current) {
        scheduleNextDetection();
      }
      // Se travado, não reagenda: loop para de verdade
    }

    // Exposto para callbacks fora do useEffect (ex.: voltar para câmera).
    restartDetectionLoopRef.current = () => {
      if (!isMounted || !embeddingModelRef.current || !videoRef.current) {
        return;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      scheduleNextDetection();
    };

    // ====== VIDEO METADATA WAITER ======
    // Helper que aguarda a câmera estar pronta
    function waitForVideoMetadata(videoElement) {
      // readyState >= 1 significa que metadata já carregou
      if (videoElement.readyState >= 1) {
        return Promise.resolve();
      }
      // Caso contrário, aguarda o evento onloadedmetadata
      return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => resolve();
      });
    }

    // ====== INIT SEQUENCE ======
    // Carrega modelo e inicia fluxo de câmera
    async function loadModelAndStartVideo() {
      async function applyBestEffortCameraTuning(stream) {
        const [videoTrack] = stream.getVideoTracks();
        if (!videoTrack || !videoTrack.getCapabilities) {
          return;
        }

        const capabilities = videoTrack.getCapabilities();
        const constraints = {
          advanced: [],
        };

        // Mantém foco contínuo quando o dispositivo suportar.
        if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
          constraints.advanced.push({ focusMode: 'continuous' });
        }

        if (
          typeof capabilities.sharpness?.max === 'number' &&
          typeof capabilities.sharpness?.min === 'number'
        ) {
          constraints.advanced.push({ sharpness: capabilities.sharpness.max });
        }

        if (
          typeof capabilities.contrast?.max === 'number' &&
          typeof capabilities.contrast?.min === 'number'
        ) {
          const contrastMid = (capabilities.contrast.max + capabilities.contrast.min) / 2;
          constraints.advanced.push({ contrast: contrastMid });
        }

        if (typeof capabilities.zoom?.max === 'number' && typeof capabilities.zoom?.min === 'number') {
          const suggestedZoom = Math.min(capabilities.zoom.max, Math.max(1, capabilities.zoom.min));
          constraints.advanced.push({ zoom: suggestedZoom });
        }

        if (!constraints.advanced.length) {
          return;
        }

        try {
          await videoTrack.applyConstraints(constraints);
        } catch (constraintError) {
          console.warn('Nao foi possivel aplicar ajustes avancados de camera.', constraintError);
        }
      }

      try {
        async function requestHighQualityCamera(preferEnvironment) {
          const preferredFacingMode = preferEnvironment
            ? { facingMode: { ideal: 'environment' } }
            : {};

          return navigator.mediaDevices.getUserMedia({
            video: {
              ...preferredFacingMode,
              width: { ideal: CAMERA_WIDTH_IDEAL, min: CAMERA_WIDTH_MIN },
              height: { ideal: CAMERA_HEIGHT_IDEAL, min: CAMERA_HEIGHT_MIN },
              frameRate: { ideal: CAMERA_FRAME_RATE, max: 30 },
            },
          });
        }

        // Aguarda TensorFlow estar pronto
        await tf.ready();
        // Carrega modelo MobileNet v1 (versão leve: alpha=0.5)
        // Usa o mesmo modelo em todos os dispositivos para manter consistência.
        embeddingModelRef.current = await mobilenet.load({
          version: 1,
          alpha: 0.5,
        });

        // ====== CÂMERA ======
        // Tenta usar câmera traseira (environment = versão de trás do celular)
        // Em desktop, prefere a principal; fallback para qualquer câmera
        let stream;
        try {
          // Ideal: camera traseira com resolução alta.
          stream = await requestHighQualityCamera(true);
        } catch (cameraError) {
          // Fallback: camera frontal ou padrão (se traseira não existe)
          stream = await requestHighQualityCamera(false);
          console.warn('Camera traseira indisponivel, usando camera padrao.', cameraError);
        }

        await applyBestEffortCameraTuning(stream);

        // Armazena stream em ref para poder parar tracks depois
        streamRef.current = stream;

        // Guard: elemento video não foi criado?
        if (!videoRef.current) {
          return;
        }

        // Conecta stream da câmera ao elemento <video>
        videoRef.current.srcObject = stream;
        // Aguarda metadata estar disponível (dimensões, etc)
        await waitForVideoMetadata(videoRef.current);

        // ====== AUTOPLAY ======
        // Em dev com StrictMode, o play pode ser interrompido por remount
        // Play retorna Promise em navegadores modernos
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }

        // Guard final: componente foi desmontado durante carga?
        if (!isMounted) {
          return;
        }

        // ====== START LOOP ======
        // Inicia o loop de detecção
        detectObjects();
      } catch (error) {
        // Ignora erros de cancelamento (user denied permission)
        if (error?.name === 'AbortError') {
          return;
        }
        // Log de erros principais (erro de câmera, modelo, etc)
        console.error('Erro ao iniciar detecção:', error);
      }
    }

    // ====== EFFECT TRIGGER ======
    // Executa init quando componente monta
    loadModelAndStartVideo();

    // ====== CLEANUP (ao desmontar componente) ======
    // Libera recursos quando componente é destruído
    return () => {
      // Marca componente como desmontado (evita state updates orphaned)
      isMounted = false;
      // Para o flag de inferência
      isInferenceRunningRef.current = false;

      // Cancela o requestAnimationFrame agendado
      // Evita que detectObjects rode após desmonte
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Para todas as tracks da câmera (libera acesso ao dispositivo)
      // Importante para evitar "em uso" em aba/app seguinte
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      restartDetectionLoopRef.current = null;
    };
  }, [getEmbeddingFromElement]);

  // ====== RENDER / JSX ======
  // Retorna a UI da aplicação
  return (
    // Container principal: muda classe quando guia está aberta
    <div className={`app-shell ${activeGuideId ? 'show-guide-page' : ''}`}>
      {/* SECTION 1: CÂMERA E CONTROLES */}
      <section id="camera-container" style={{ display: 'block' }}>
        {/* Video element: obtém stream da câmera */}
        <video ref={videoRef} id="videoElement" autoPlay muted playsInline />
        
        {/* Cubo 3D e botões de navegação - aparecem quando detecta */}
        {showArCube && (
          <div className="cube-controls">
            {/* Botão do cubo: abre página guia do modelo 3D selecionado */}
            <button
              type="button"
              className="cube-button"
              onClick={openSelectedGuidePage}
              aria-label={`Abrir guia de ${currentObject.label}`}
            >
              <div
                className={`cube-overlay ${currentObject.cubeClassName}`}
                aria-hidden="true"
              >
                <div className="cube-face cube-front" />
                <div className="cube-face cube-back" />
                <div className="cube-face cube-right" />
                <div className="cube-face cube-left" />
                <div className="cube-face cube-top" />
                <div className="cube-face cube-bottom" />
              </div>
            </button>

            {/* Botão "próximo": troca entre modelos 3D (capacete <-> óculos) */}
            {/* Funciona MESMO quando travado - independente da detecção */}
            <button
              type="button"
              className="cube-next-button"
              onClick={showNextObject}
              aria-label="Passar para o proximo objeto"
            >
              →
            </button>
          </div>
        )}
        
        {/* Painel de controles: upload de imagens + status */}
        <div className="controls-panel">
          {/* Label e input para upload de imagens de referência */}
          <label htmlFor="referenceUpload">
            Imagens de referencia (maximo 5)
          </label>
          <input
            id="referenceUpload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleReferenceUpload}
          />
          {/* Mensagem de status: progresso de carregamento ou erro */}
          <div className="controls-message">{referenceMessage}</div>
          {/* Exibe porcentagem atual de similaridade em tempo real */}
          <div className="controls-message">
            Similaridade atual: {Math.round(similarityScore * 100)}%
          </div>
          {/* Exibe qual objeto EPI está selecionado */}
          <div className="controls-message">
            Objeto atual: {currentObject.label}
          </div>
        </div>
        
        {/* Mensagem principal: resultado da detecção ou status */}
        {/* Fixa quando travado (\"Deteccao confirmada. Selecao 3D fixa.\") */}
        <div id="detectedMessage" className="detected-message">
          {detectedMessage}
        </div>
      </section>

      {/* SECTION 2: PÁGINA GUIA - renderizam quando activeGuideId definido */}
      {/* Aparece em overlay quando usuário clica no cubo 3D */}
      {/* app-shell adiciona classe show-guide-page que oculta camera-container */}
      <section className="guide-page-wrapper">
        {activeGuideId === 'belt' ? (
          <GogglesGuidePage onBack={closeGuidePage} />
        ) : activeGuideId === 'lanyard' ? (
          <TalabarteGuidePage onBack={closeGuidePage} />
        ) : activeGuideId === 'fall-arrest' ? (
          <TravaQuedasGuidePage onBack={closeGuidePage} />
        ) : (
          <HelmetGuidePage onBack={closeGuidePage} />
        )}
      </section>
    </div>
  );
}