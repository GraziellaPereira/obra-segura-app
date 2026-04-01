import React from 'react';

export default function TravaQuedasGuidePage({ onBack }) {
  return (
    <section className="helmet-page" aria-labelledby="travaquedas-guide-title">
      <header className="helmet-header">
        <p className="helmet-kicker">Guia de EPI para Andaime</p>
        <h1 id="travaquedas-guide-title">Trava-quedas</h1>
        <p className="helmet-intro">
          O trava-quedas bloqueia o deslocamento em caso de queda e deve ser usado
          conforme orientacao do fabricante e procedimento de trabalho em altura.
        </p>
      </header>

      <div className="helmet-content">
        <article className="helmet-card">
          <h2>1. Conferencia inicial</h2>
          <ul>
            <li>Verifique corpo do equipamento, indicador de queda e conectores.</li>
            <li>Confirme que cabo/linha de vida esta em boas condicoes.</li>
            <li>Realize teste funcional rapido antes de subir no andaime.</li>
          </ul>
        </article>

        <article className="helmet-card">
          <h2>2. Instalacao correta</h2>
          <ul>
            <li>Respeite o sentido de uso indicado no dispositivo.</li>
            <li>Mantenha alinhamento com o ponto de ancoragem.</li>
            <li>Evite usar com cabos, cordas ou trilhos fora da especificacao.</li>
          </ul>
        </article>

        <article className="helmet-card">
          <h2>3. Uso e manutencao</h2>
          <ul>
            <li>Nao improvise extensoes ou adaptacoes nao homologadas.</li>
            <li>Apos travamento por queda, retire de uso para inspecao tecnica.</li>
            <li>Guarde limpo e seco, protegido de impacto e contaminantes.</li>
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
