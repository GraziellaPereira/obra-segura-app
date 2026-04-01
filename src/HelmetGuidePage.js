import React from 'react';

export default function HelmetGuidePage({ onBack }) {
  return (
    <section className="helmet-page" aria-labelledby="helmet-guide-title">
      <header className="helmet-header">
        <p className="helmet-kicker">Seguranca na Obra</p>
        <h1 id="helmet-guide-title">Como usar o capacete corretamente</h1>
        <p className="helmet-intro">
          O capacete de seguranca reduz impactos na cabeca e protege contra queda
          de materiais. Antes de entrar na obra, garanta que ele esteja ajustado,
          sem danos e corretamente afivelado.
        </p>
      </header>

      <div className="helmet-content">
        <article className="helmet-card">
          <h2>1. Inspecao antes do uso</h2>
          <ul>
            <li>Verifique se ha trincas, amassados ou deformacoes na casca.</li>
            <li>Confirme se a carneira interna esta firme e sem desgaste.</li>
            <li>Nao use capacete vencido ou com historico de impacto forte.</li>
          </ul>
        </article>

        <article className="helmet-card">
          <h2>2. Ajuste correto na cabeca</h2>
          <ul>
            <li>Ajuste a carneira para ficar firme, sem apertar excessivamente.</li>
            <li>O capacete deve ficar nivelado, sem inclinar para tras.</li>
            <li>Se houver jugular, mantenha-a fechada durante a atividade.</li>
          </ul>
        </article>

        <article className="helmet-card">
          <h2>3. Uso durante o trabalho</h2>
          <ul>
            <li>Mantenha o capacete durante toda permanencia na area de risco.</li>
            <li>Nao perfure, pinte ou cole itens que comprometam a estrutura.</li>
            <li>Armazene em local seco, longe de sol intenso e produtos quimicos.</li>
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
