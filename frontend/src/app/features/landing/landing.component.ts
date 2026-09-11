import { Component, OnInit, inject } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-landing",
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="mk">
      <!-- nav -->
      <header class="mk-nav">
        <div class="mk-nav__inner">
          <span class="mk-wordmark">Imoboo</span>
          <nav class="mk-nav__links">
            <a href="#como-funciona">Como funciona</a>
            <a href="#produto">O que você recebe</a>
          </nav>
          <a routerLink="/entrar" class="mk-btn mk-btn--ghost-dark">Entrar</a>
        </div>
      </header>

      <!-- hero -->
      <section class="mk-hero">
        <div class="mk-hero__grid">
          <div class="mk-hero__copy">
            <h1 class="mk-h1">
              Enquanto você mostra<br />
              um imóvel, alguém está<br />
              perguntando sobre outro<br />
              no WhatsApp.
            </h1>
            <p class="mk-lede">
              O Imoboo responde na hora — com dados reais do seu catálogo, não
              invenção — e só te chama quando o cliente precisa mesmo de você.
            </p>
            <div class="mk-hero__actions">
              <a routerLink="/entrar" class="mk-btn mk-btn--brass">Começar agora</a>
              <a href="#como-funciona" class="mk-btn mk-btn--ghost">Ver como funciona</a>
            </div>
          </div>

          <div class="mk-hero__phone">
            <div class="mk-phone">
              <div class="mk-phone__head">
                <span class="mk-phone__dot"></span>
                <span class="mk-phone__title">Cliente · WhatsApp</span>
              </div>
              <div class="mk-phone__body">
                <div class="mk-bubble mk-bubble--in mk-anim-1">
                  Oi! Tem apê de 2 quartos até 300 mil?
                </div>
                <div class="mk-bubble mk-bubble--typing mk-anim-2">
                  <span></span><span></span><span></span>
                </div>
                <div class="mk-bubble mk-bubble--out mk-anim-3">
                  Tenho 2 opções: AP-0101 em Boa Viagem, R$ 285.000, 2 quartos,
                  aceita financiamento. Quer ver as fotos?
                </div>
                <div class="mk-phone__tag mk-anim-4">IA respondendo · dados do seu catálogo</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- linha de transicao -->
      <section class="mk-bridge">
        <p>Todo corretor sabe: o cliente que espera resposta é o cliente que fecha com outro.</p>
      </section>

      <!-- como funciona -->
      <section class="mk-section mk-section--light" id="como-funciona">
        <div class="mk-section__inner">
          <h2 class="mk-h2">Como funciona, do jeito que acontece de verdade</h2>

          <ol class="mk-steps">
            <li>
              <span class="mk-steps__n">1</span>
              <div>
                <h3>A mensagem chega</h3>
                <p>Pelo número que você já usa no WhatsApp, via Evolution API.</p>
              </div>
            </li>
            <li>
              <span class="mk-steps__n">2</span>
              <div>
                <h3>A IA consulta o seu catálogo</h3>
                <p>Preço, bairro, quartos, financiamento — sempre do que está cadastrado, nunca inventado.</p>
              </div>
            </li>
            <li>
              <span class="mk-steps__n">3</span>
              <div>
                <h3>Responde na hora</h3>
                <p>Em segundos, com os imóveis que realmente combinam com o que o cliente pediu.</p>
              </div>
            </li>
            <li>
              <span class="mk-steps__n">4</span>
              <div>
                <h3>Você assume quando quiser</h3>
                <p>Negociação, documentação ou um pedido direto de falar com alguém: a conversa vem pra você.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <!-- features -->
      <section class="mk-section mk-section--light" id="produto">
        <div class="mk-section__inner">
          <div class="mk-feature">
            <div class="mk-feature__text">
              <h2 class="mk-h2">Um catálogo que a IA realmente usa</h2>
              <p>Cadastre o imóvel uma vez — código, preço, bairro, características, fotos.
                A partir daí, é isso que a IA cita para cada cliente. Nenhuma informação
                que ela dá para o lead existe só na cabeça dela.</p>
            </div>
            <div class="mk-feature__visual mk-visual--catalog" aria-hidden="true">
              <div class="mk-visual__card">
                <span class="mk-visual__code">AP-0101</span>
                <span>Boa Viagem · R$ 285.000</span>
                <span class="mk-visual__note">2 quartos · aceita financiamento</span>
              </div>
            </div>
          </div>

          <div class="mk-feature mk-feature--reverse">
            <div class="mk-feature__text">
              <h2 class="mk-h2">Um painel que mostra o que importa</h2>
              <p>Não é uma tela cheia de gráfico. É um número, grande, sozinho: quantas
                conversas estão esperando por você agora. O resto é contexto.</p>
            </div>
            <div class="mk-feature__visual mk-visual--panel" aria-hidden="true">
              <div class="mk-visual__stat">
                <span class="mk-visual__big">3</span>
                <span>conversas esperando você</span>
              </div>
            </div>
          </div>

          <div class="mk-feature">
            <div class="mk-feature__text">
              <h2 class="mk-h2">Funil e agendamentos, sem planilha</h2>
              <p>Cada lead avança de etapa conforme a conversa acontece. Visitas e
                retornos combinados ficam numa lista só — nada perdido em caderno
                ou em conversa antiga.</p>
            </div>
            <div class="mk-feature__visual mk-visual--funnel" aria-hidden="true">
              <div class="mk-visual__bar" style="width: 88%">Novo</div>
              <div class="mk-visual__bar" style="width: 62%">Em atendimento</div>
              <div class="mk-visual__bar" style="width: 34%">Visita agendada</div>
            </div>
          </div>
        </div>
      </section>

      <!-- pull quote -->
      <section class="mk-quote">
        <p>
          "Se o cliente pergunta algo que não está no catálogo, a IA não chuta —
          ela diz que vai confirmar com você. Preço errado no WhatsApp custa
          venda e confiança; a gente prefere perder tempo a inventar resposta."
        </p>
      </section>

      <!-- cta -->
      <section class="mk-cta">
        <h2 class="mk-h2 mk-h2--inverse">Solte o celular. A gente cuida da primeira resposta.</h2>
        <a routerLink="/entrar" class="mk-btn mk-btn--brass">Criar minha conta</a>
      </section>

      <footer class="mk-footer">
        <span class="mk-wordmark mk-wordmark--small">Imoboo</span>
        <span>CRM para corretores e imobiliárias.</span>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      --mk-ink: #171A21;
      --mk-ink-soft: #8B93A0;
      --mk-paper: #EFEAE0;
      --mk-paper-soft: #E4DDCC;
      --mk-cream: #F8F5EE;
      --mk-text: #22262E;
      --mk-text-soft: #5B6270;
      --mk-brass: #A87830;
      --mk-brass-bright: #C79A52;
      --mk-forest: #2F4A3B;
      --mk-line-dark: rgba(239, 234, 224, 0.14);
      --mk-line-light: rgba(23, 26, 33, 0.12);
      --font-serif: "Fraunces", Georgia, serif;
      display: block;
      background: var(--mk-paper);
    }

    .mk { color: var(--mk-text); }
    .mk h1, .mk h2, .mk h3 { font-family: var(--font-serif); font-weight: 500; letter-spacing: -0.01em; }

    .mk-btn {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 12px 22px; border-radius: 3px; font-weight: 600; font-size: 15px;
      text-decoration: none; border: 1px solid transparent; cursor: pointer;
    }
    .mk-btn--brass { background: var(--mk-brass); color: #1A1305; }
    .mk-btn--brass:hover { background: var(--mk-brass-bright); text-decoration: none; }
    .mk-btn--ghost { border-color: var(--mk-line-light); color: var(--mk-text); }
    .mk-btn--ghost:hover { background: var(--mk-paper-soft); text-decoration: none; }
    .mk-btn--ghost-dark { border-color: var(--mk-line-dark); color: var(--mk-paper); }
    .mk-btn--ghost-dark:hover { background: rgba(255,255,255,0.06); text-decoration: none; }

    /* --- nav --- */
    .mk-nav { background: var(--mk-ink); }
    .mk-nav__inner {
      max-width: 1180px; margin: 0 auto; padding: 20px 32px;
      display: flex; align-items: center; justify-content: space-between; gap: var(--gap-lg);
    }
    .mk-wordmark { font-family: var(--font-serif); font-size: 21px; font-weight: 600; color: var(--mk-paper); }
    .mk-wordmark--small { font-size: 16px; }
    .mk-nav__links { display: flex; gap: 28px; flex: 1; justify-content: center; }
    .mk-nav__links a { color: var(--mk-ink-soft); font-size: 14px; text-decoration: none; }
    .mk-nav__links a:hover { color: var(--mk-paper); text-decoration: none; }

    /* --- hero --- */
    .mk-hero { background: var(--mk-ink); padding: 64px 32px 96px; }
    .mk-hero__grid {
      max-width: 1180px; margin: 0 auto;
      display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 64px; align-items: center;
    }
    .mk-h1 { color: var(--mk-paper); font-size: 44px; line-height: 1.16; margin: 0 0 24px; }
    .mk-lede { color: var(--mk-ink-soft); font-size: 17px; line-height: 1.6; max-width: 46ch; margin: 0 0 32px; }
    .mk-hero__actions { display: flex; gap: 14px; flex-wrap: wrap; }

    /* --- phone mockup --- */
    .mk-hero__phone { display: flex; justify-content: center; }
    .mk-phone {
      width: 100%; max-width: 340px; border-radius: 22px; background: #0E1015;
      border: 1px solid var(--mk-line-dark); padding: 4px; box-shadow: 0 30px 60px -20px rgba(0,0,0,0.5);
    }
    .mk-phone__head {
      display: flex; align-items: center; gap: 8px; padding: 14px 16px;
      border-bottom: 1px solid var(--mk-line-dark);
    }
    .mk-phone__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--mk-forest); }
    .mk-phone__title { font-size: 12px; color: var(--mk-ink-soft); }
    .mk-phone__body { padding: 18px 16px 22px; display: flex; flex-direction: column; gap: 10px; min-height: 220px; }

    .mk-bubble {
      max-width: 84%; padding: 10px 13px; border-radius: 12px; font-size: 13.5px; line-height: 1.45;
      opacity: 0; transform: translateY(6px); animation: mk-rise 0.5s ease forwards;
    }
    .mk-bubble--in { align-self: flex-start; background: #1E222B; color: var(--mk-paper); border-bottom-left-radius: 3px; }
    .mk-bubble--out { align-self: flex-end; background: var(--mk-brass); color: #1A1305; border-bottom-right-radius: 3px; font-weight: 500; }
    .mk-bubble--typing {
      align-self: flex-start; background: #1E222B; display: flex; gap: 4px; padding: 12px 14px;
    }
    .mk-bubble--typing span {
      width: 5px; height: 5px; border-radius: 50%; background: var(--mk-ink-soft);
      animation: mk-typing 1s ease infinite;
    }
    .mk-bubble--typing span:nth-child(2) { animation-delay: 0.15s; }
    .mk-bubble--typing span:nth-child(3) { animation-delay: 0.3s; }

    .mk-anim-1 { animation-delay: 0.1s; }
    .mk-anim-2 { animation-delay: 0.9s; }
    .mk-anim-3 { animation-delay: 1.9s; }
    .mk-phone__tag {
      align-self: flex-end; font-size: 11px; color: var(--mk-forest); font-weight: 600;
      opacity: 0; animation: mk-rise 0.5s ease forwards; animation-delay: 2.5s;
    }

    @keyframes mk-rise { to { opacity: 1; transform: translateY(0); } }
    @keyframes mk-typing { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }

    /* --- bridge line --- */
    .mk-bridge { background: var(--mk-ink); padding: 0 32px 88px; }
    .mk-bridge p {
      max-width: 720px; margin: 0 auto; text-align: left; font-family: var(--font-serif);
      font-size: 24px; line-height: 1.4; color: var(--mk-paper); border-left: 3px solid var(--mk-brass);
      padding-left: 24px;
    }

    /* --- sections --- */
    .mk-section--light { background: var(--mk-paper); padding: 88px 32px; }
    .mk-section__inner { max-width: 1180px; margin: 0 auto; }
    .mk-h2 { font-size: 30px; line-height: 1.25; margin: 0 0 12px; max-width: 26ch; }
    .mk-h2--inverse { color: var(--mk-paper); }

    /* --- steps (legitimately sequential, numbered) --- */
    .mk-steps { list-style: none; margin: 48px 0 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
    .mk-steps li { display: flex; flex-direction: column; gap: 10px; }
    .mk-steps__n {
      font-family: var(--font-serif); font-size: 15px; font-weight: 600; color: var(--mk-brass);
      border: 1px solid var(--mk-brass); width: 30px; height: 30px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }
    .mk-steps h3 { font-size: 17px; margin: 0 0 4px; }
    .mk-steps p { margin: 0; color: var(--mk-text-soft); font-size: 14px; line-height: 1.55; }

    /* --- feature rows (asymmetric, alternating — deliberately not identical cards) --- */
    .mk-feature {
      display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center;
      padding: 56px 0; border-top: 1px solid var(--mk-line-light);
    }
    .mk-feature:first-child { border-top: none; }
    .mk-feature--reverse .mk-feature__text { order: 2; }
    .mk-feature__text p { color: var(--mk-text-soft); font-size: 15.5px; line-height: 1.65; max-width: 42ch; margin: 0; }

    .mk-feature__visual {
      background: var(--mk-cream); border: 1px solid var(--mk-line-light); border-radius: 8px;
      padding: 32px; min-height: 180px; display: flex; align-items: center; justify-content: center;
    }
    .mk-visual__card { display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
    .mk-visual__code { font-family: var(--font-code); font-size: 12px; color: var(--mk-brass); letter-spacing: 0.03em; }
    .mk-visual__note { color: var(--mk-text-soft); font-size: 13px; }

    .mk-visual__stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .mk-visual__big { font-family: var(--font-serif); font-size: 64px; color: var(--mk-forest); line-height: 1; }

    .mk-visual__funnel { display: flex; flex-direction: column; gap: 10px; }
    .mk-visual--funnel { flex-direction: column; align-items: stretch; gap: 10px; padding: 32px; }
    .mk-visual__bar {
      background: var(--mk-forest); color: var(--mk-cream); font-size: 12px; font-weight: 500;
      padding: 8px 12px; border-radius: 4px;
    }

    /* --- pull quote --- */
    .mk-quote { background: var(--mk-cream); padding: 96px 32px; }
    .mk-quote p {
      max-width: 760px; margin: 0 auto; font-family: var(--font-serif); font-size: 26px;
      line-height: 1.45; color: var(--mk-text); text-align: left;
    }

    /* --- cta --- */
    .mk-cta { background: var(--mk-ink); padding: 96px 32px; text-align: center; }
    .mk-cta .mk-h2 { max-width: none; margin: 0 auto 32px; }

    /* --- footer --- */
    .mk-footer {
      background: var(--mk-paper); padding: 28px 32px; display: flex; gap: 12px; align-items: baseline;
      color: var(--mk-text-soft); font-size: 13px; max-width: 1180px; margin: 0 auto;
    }

    @media (max-width: 900px) {
      .mk-hero__grid { grid-template-columns: 1fr; gap: 40px; }
      .mk-h1 { font-size: 32px; }
      .mk-nav__links { display: none; }
      .mk-steps { grid-template-columns: 1fr 1fr; }
      .mk-feature, .mk-feature--reverse .mk-feature__text { grid-template-columns: 1fr; order: initial; }
      .mk-feature { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .mk-steps { grid-template-columns: 1fr; }
    }
  `],
})
export class LandingComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // Quem já está logado não precisa ver a landing de novo.
    if (this.auth.isAuthenticated()) void this.router.navigate(["/painel"]);
  }
}
