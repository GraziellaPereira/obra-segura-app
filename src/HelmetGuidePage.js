import React from 'react';

export default function HelmetGuidePage({ onBack }) {
  return (
    <section className="helmet-page" aria-labelledby="helmet-guide-title">
      <header className="helmet-header">
        <p className="helmet-kicker">Guia de EPI para Andaime</p>
        <h1 id="helmet-guide-title">Capacete de seguranca em andaimes</h1>
        <p className="helmet-intro">
          O capacete protege contra impactos e queda de objetos durante montagem,
          deslocamento e trabalho sobre plataformas de andaime. O ajuste correto
          e obrigatorio em toda a area de risco.
        </p>
      </header>

      <div className="helmet-content">
        <article className="helmet-card">
          <h2>1. Inspecao antes do uso</h2>
          <ul>
            <li>Verifique casco, carneira e jugular sem trincas ou deformacoes.</li>
            <li>Confirme data de validade e integridade dos pontos de fixacao.</li>
            <li>Troque imediatamente apos impacto significativo.</li>
          </ul>
        </article>

        <article className="helmet-card">
          <h2>2. Ajuste correto na cabeca</h2>
          <ul>
            <li>Ajuste a carneira para fixacao firme e confortavel.</li>
            <li>Mantenha o capacete nivelado, sem deslocar para tras.</li>
            <li>Use jugular fechada sempre que houver risco de queda.</li>
          </ul>
        </article>

        <article className="helmet-card">
          <h2>3. Boas praticas no andaime</h2>
          <ul>
            <li>Nao retire o capacete durante acesso por escadas e plataformas.</li>
            <li>Nao perfure, pinte ou cole acessorios sem aprovacao tecnica.</li>
            <li>Guarde em local seco, longe de calor intenso e produtos quimicos.</li>
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
