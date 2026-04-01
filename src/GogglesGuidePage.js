import React from 'react';

export default function GogglesGuidePage({ onBack }) {
  return (
    <section className="helmet-page" aria-labelledby="goggles-guide-title">
      <header className="helmet-header">
        <p className="helmet-kicker">Seguranca na Obra</p>
        <h1 id="goggles-guide-title">Oculos de protecao na operacao da betoneira</h1>
        <p className="helmet-intro">
          O oculos de protecao evita lesoes graves causadas por respingos de
          cimento, areia e pequenas particulas lancadas durante o preparo e
          descarregamento da betoneira.
        </p>
      </header>

      <div className="helmet-content">
        <article className="helmet-card">
          <h2>1. Por que o oculos e essencial</h2>
          <ul>
            <li>Respingos de argamassa podem causar irritacao e queimadura quimica.</li>
            <li>Particulas em suspensao podem atingir os olhos em alta velocidade.</li>
            <li>Uma lesao ocular pode afastar o trabalhador e comprometer a obra.</li>
          </ul>
        </article>

        <article className="helmet-card">
          <h2>2. Como usar corretamente</h2>
          <ul>
            <li>Escolha oculos com vedacao lateral e lentes sem trincas.</li>
            <li>Ajuste para ficar firme no rosto sem incomodar.</li>
            <li>Use junto com capacete e demais EPIs exigidos no local.</li>
          </ul>
        </article>

        <article className="helmet-card">
          <h2>3. Cuidados durante e apos o uso</h2>
          <ul>
            <li>Limpe as lentes com pano macio para nao riscar.</li>
            <li>Troque o equipamento se estiver opaco ou danificado.</li>
            <li>Guarde em estojo ou local protegido contra poeira e calor.</li>
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
