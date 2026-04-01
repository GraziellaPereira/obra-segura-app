import React from 'react';

export default function GogglesGuidePage({ onBack }) {
  return (
    <section className="helmet-page" aria-labelledby="belt-guide-title">
      <header className="helmet-header">
        <p className="helmet-kicker">Guia de EPI para Andaime</p>
        <h1 id="belt-guide-title">Cinto de seguranca tipo paraquedista</h1>
        <p className="helmet-intro">
          O cinto de seguranca e o EPI principal para trabalho em altura em
          andaimes. Ele reduz risco de queda quando conectado a ponto de
          ancoragem adequado.
        </p>
      </header>

      <div className="helmet-content">
        <article className="helmet-card">
          <h2>1. Inspecao obrigatoria</h2>
          <ul>
            <li>Verifique costuras, fivelas, argolas e etiquetas de identificacao.</li>
            <li>Nao use cintos com cortes, fibras expostas ou deformacoes.</li>
            <li>Confirme se o CA e validade atendem ao procedimento da obra.</li>
          </ul>
        </article>

        <article className="helmet-card">
          <h2>2. Ajuste no corpo</h2>
          <ul>
            <li>Ajuste pernas, cintura e peitoral sem folgas excessivas.</li>
            <li>O ponto dorsal deve ficar centralizado nas costas.</li>
            <li>Evite torcoes nas fitas para garantir distribuicao de carga.</li>
          </ul>
        </article>

        <article className="helmet-card">
          <h2>3. Conexao e uso em andaime</h2>
          <ul>
            <li>Conecte somente em ancoragem prevista e validada tecnicamente.</li>
            <li>Mantenha talabarte e trava-quedas sem atrito com arestas vivas.</li>
            <li>Apos uso, higienize e armazene em local seco e protegido.</li>
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
