import React from 'react';

export default function TalabarteGuidePage({ onBack }) {
  return (
    <section className="helmet-page" aria-labelledby="talabarte-guide-title">
      <header className="helmet-header">
        <p className="helmet-kicker">Guia de EPI para Andaime</p>
        <h1 id="talabarte-guide-title">Talabarte de seguranca</h1>
        <p className="helmet-intro">
          O talabarte faz a ligacao entre o cinto paraquedista e a ancoragem.
          Em andaimes, uso incorreto aumenta fator de queda e risco de lesao grave.
        </p>
      </header>

      <div className="helmet-content">
        <article className="helmet-card">
          <h2>1. Verificacao antes do uso</h2>
          <ul>
            <li>Inspecione fitas, costuras, absorvedor e conectores.</li>
            <li>Nao use com sinais de desgaste, corte ou abrasao intensa.</li>
            <li>Confirme compatibilidade com cinto e ancoragem da atividade.</li>
          </ul>
        </article>

        <article className="helmet-card">
          <h2>2. Conexao segura</h2>
          <ul>
            <li>Use mosquetoes com trava automatica funcionando corretamente.</li>
            <li>Garanta fechamento total do gatilho e ausencia de folga indevida.</li>
            <li>Evite conexao cruzada e ponto sem resistencia comprovada.</li>
          </ul>
        </article>

        <article className="helmet-card">
          <h2>3. Boas praticas em andaime</h2>
          <ul>
            <li>Mantenha o talabarte acima da linha da cintura quando possivel.</li>
            <li>Reduza comprimento livre para diminuir distancia de queda.</li>
            <li>Substitua imediatamente apos evento de queda ou travamento do sistema.</li>
          </ul>
        </article>
      </div>

      <div className="helmet-actions">
        <button type="button" className="back-button" onClick={onBack}>
          Voltar para a camera
        </button>
      </div>
    </section>
  );
}
