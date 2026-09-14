import { Component, OnInit, inject } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { ScrollRevealDirective } from "../../shared/directives/scroll-reveal.directive";

const WHATSAPP_NUMBER = "5581996533458";
const WHATSAPP_MESSAGE = "Olá! Vi o Imoboo e quero saber mais sobre o sistema.";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

@Component({
  selector: "app-landing",
  standalone: true,
  imports: [RouterLink, ScrollRevealDirective],
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
          <a [href]="whatsappUrl" target="_blank" rel="noopener" class="mk-btn mk-btn--brass mk-btn--nav">
            Fazer orçamento
          </a>
        </div>
      </header>

      <!-- hero -->
      <section class="mk-hero">
        <div class="mk-hero__glow" aria-hidden="true"></div>
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
              <a [href]="whatsappUrl" target="_blank" rel="noopener" class="mk-btn mk-btn--brass">
                Fazer seu orçamento
              </a>
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
        <p [appScrollReveal]="0" class="mk-reveal">
          Todo corretor sabe: o cliente que espera resposta é o cliente que fecha com outro.
        </p>
      </section>

      <!-- vitrine do produto -->
      <section class="mk-showcase">
        <div [appScrollReveal]="0" class="mk-showcase__frame mk-reveal">
          <div class="mk-browser">
            <span class="mk-browser__dot"></span>
            <span class="mk-browser__dot"></span>
            <span class="mk-browser__dot"></span>
            <span class="mk-browser__url">app.imoboo.com.br/painel</span>
          </div>
          <div class="mk-dash">
            <div class="mk-dash__attention">
              <span class="mk-dash__big">3</span>
              <span>conversas esperando você</span>
              <span class="mk-dash__aside">12 sendo conduzidas pela IA</span>
            </div>
            <div class="mk-dash__stats">
              <div class="mk-dash__stat"><span>Leads novos</span><strong>8</strong></div>
              <div class="mk-dash__stat"><span>Em atendimento</span><strong>14</strong></div>
              <div class="mk-dash__stat"><span>Leads quentes</span><strong>5</strong></div>
              <div class="mk-dash__stat"><span>Imóveis disponíveis</span><strong>42</strong></div>
            </div>
            <div class="mk-dash__funnel">
              <div class="mk-dash__bar" style="width: 92%">Novo</div>
              <div class="mk-dash__bar" style="width: 68%">Em atendimento</div>
              <div class="mk-dash__bar" style="width: 40%">Visita agendada</div>
              <div class="mk-dash__bar" style="width: 18%">Fechado</div>
            </div>
          </div>
        </div>
        <p class="mk-showcase__caption">O painel real do Imoboo — o número que importa, sempre na frente.</p>
      </section>

      <!-- como funciona -->
      <section class="mk-section mk-section--light" id="como-funciona">
        <div class="mk-section__inner">
          <h2 [appScrollReveal]="0" class="mk-h2 mk-reveal">Como funciona, do jeito que acontece de verdade</h2>

          <ol class="mk-steps">
            <li [appScrollReveal]="0" class="mk-reveal">
              <span class="mk-steps__n">1</span>
              <div>
                <h3>A mensagem chega</h3>
                <p>Pelo número que você já usa no WhatsApp, via Evolution API.</p>
              </div>
            </li>
            <li [appScrollReveal]="80" class="mk-reveal">
              <span class="mk-steps__n">2</span>
              <div>
                <h3>Um menu rápido, sem IA</h3>
                <p>Catálogo ou falar com atendente — a escolha simples não gasta token nenhum.</p>
              </div>
            </li>
            <li [appScrollReveal]="160" class="mk-reveal">
              <span class="mk-steps__n">3</span>
              <div>
                <h3>A IA entra quando faz sentido</h3>
                <p>Só quando o cliente pede — aí sim consulta o catálogo e responde de verdade.</p>
              </div>
            </li>
            <li [appScrollReveal]="240" class="mk-reveal">
              <span class="mk-steps__n">4</span>
              <div>
                <h3>Você assume quando quiser</h3>
                <p>Negociação, documentação ou um pedido direto: a conversa vem pra você.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <!-- features -->
      <section class="mk-section mk-section--light" id="produto">
        <div class="mk-section__inner">
          <div [appScrollReveal]="0" class="mk-feature mk-reveal">
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

          <div [appScrollReveal]="0" class="mk-feature mk-feature--reverse mk-reveal">
            <div class="mk-feature__text">
              <h2 class="mk-h2">Um link de catálogo pra cada cliente</h2>
              <p>Quem responde "catálogo" no menu recebe um link com fotos, cards e
                filtro por bairro, preço e quartos — sem precisar baixar nada nem
                falar com ninguém antes de decidir o que quer ver de perto.</p>
            </div>
            <div class="mk-feature__visual mk-visual--panel" aria-hidden="true">
              <div class="mk-visual__stat">
                <span class="mk-visual__big">3</span>
                <span>conversas esperando você</span>
              </div>
            </div>
          </div>

          <div [appScrollReveal]="0" class="mk-feature mk-reveal">
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
        <p [appScrollReveal]="0" class="mk-reveal">
          "Se o cliente pergunta algo que não está no catálogo, a IA não chuta —
          ela diz que vai confirmar com você. Preço errado no WhatsApp custa
          venda e confiança; a gente prefere perder tempo a inventar resposta."
        </p>
      </section>

      <!-- cta -->
      <section class="mk-cta">
        <h2 [appScrollReveal]="0" class="mk-h2 mk-h2--inverse mk-reveal">
          Solte o celular. A gente cuida da primeira resposta.
        </h2>
        <a [href]="whatsappUrl" target="_blank" rel="noopener" class="mk-btn mk-btn--brass">
          Fazer seu orçamento
        </a>
      </section>

      <footer class="mk-footer-full">
        <div class="mk-footer-full__inner">
          <div class="mk-footer-full__brand">
            <span class="mk-wordmark">Imoboo</span>
            <p>O app do corretor de imóveis.</p>
          </div>

          <div class="mk-footer-full__col">
            <h3>Sobre o app</h3>
            <ul>
              <li><a routerLink="/">Imoboo</a></li>
              <li><a [href]="whatsappUrl" target="_blank" rel="noopener">Fazer meu orçamento</a></li>
              <li><a href="mailto:davissonfalcaosjr@gmail.com">Contato</a></li>
            </ul>
          </div>

          <div class="mk-footer-full__col">
            <h3>Ajuda</h3>
            <ul>
              <li><a href="#como-funciona">Tutoriais</a></li>
              <li><a [href]="whatsappUrl" target="_blank" rel="noopener">Suporte</a></li>
            </ul>
          </div>
        </div>

        <div class="mk-footer-full__bottom">
          <span>© {{ currentYear }} Imoboo.</span>
        </div>
      </footer>

      <!-- botao flutuante -->
      <a [href]="whatsappUrl" target="_blank" rel="noopener" class="mk-fab">
        <span class="mk-fab__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2a8.1 8.1 0 0 1-4.2-1.1l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4.2-.4c.1-.1.1-.3 0-.4-.1-.1-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3a2.7 2.7 0 0 0-.9 2c0 1.2.9 2.3 1 2.5.1.2 1.7 2.7 4.2 3.7.6.2 1 .4 1.4.5.6.2 1.1.1 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3Z"/>
          </svg>
        </span>
        <span class="mk-fab__label">Fazer orçamento</span>
      </a>
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
      --mk-whatsapp: #25D366;
      --mk-line-dark: rgba(239, 234, 224, 0.14);
      --mk-line-light: rgba(23, 26, 33, 0.12);
      --font-serif: "Fraunces", Georgia, serif;
      display: block;
      background: var(--mk-paper);
    }

    .mk { color: var(--mk-text); }
    .mk h1, .mk h2, .mk h3 { font-family: var(--font-serif); font-weight: 500; letter-spacing: -0.01em; }

    /* --- revelacao no scroll: aplica em todo elemento marcado appScrollReveal --- */
    .mk-reveal {
      opacity: 0;
      transform: translateY(28px);
      transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .mk-reveal.is-visible { opacity: 1; transform: translateY(0); }

    .mk-btn {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 12px 22px; border-radius: 3px; font-weight: 600; font-size: 15px;
      text-decoration: none; border: 1px solid transparent; cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    }
    .mk-btn--brass { background: var(--mk-brass); color: #1A1305; }
    .mk-btn--brass:hover { background: var(--mk-brass-bright); text-decoration: none; transform: translateY(-2px); box-shadow: 0 10px 24px -10px rgba(168,120,48,0.55); }
    .mk-btn--ghost { border-color: var(--mk-line-light); color: var(--mk-text); }
    .mk-btn--ghost:hover { background: var(--mk-paper-soft); text-decoration: none; transform: translateY(-2px); }
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
    .mk-nav__links a { color: var(--mk-ink-soft); font-size: 14px; text-decoration: none; transition: color 0.2s ease; }
    .mk-nav__links a:hover { color: var(--mk-paper); text-decoration: none; }

    /* --- hero --- */
    .mk-hero { position: relative; background: var(--mk-ink); padding: 64px 32px 96px; overflow: hidden; }
    .mk-hero__glow {
      position: absolute; inset: -20% -10% auto -10%; height: 640px;
      background: radial-gradient(closest-side, rgba(168,120,48,0.28), transparent 70%);
      filter: blur(10px); animation: mk-drift 14s ease-in-out infinite alternate; pointer-events: none;
    }
    @keyframes mk-drift {
      from { transform: translate(-4%, -2%) scale(1); }
      to   { transform: translate(4%, 3%) scale(1.08); }
    }
    .mk-hero__grid {
      position: relative; max-width: 1180px; margin: 0 auto;
      display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 64px; align-items: center;
    }
    .mk-h1 { color: var(--mk-paper); font-size: 52px; line-height: 1.13; margin: 0 0 24px; }
    .mk-btn--nav { padding: 10px 18px; font-size: 14px; }
    .mk-lede { color: var(--mk-ink-soft); font-size: 17px; line-height: 1.6; max-width: 46ch; margin: 0 0 32px; }
    .mk-hero__actions { display: flex; gap: 14px; flex-wrap: wrap; }

    /* --- phone mockup --- */
    .mk-hero__phone { display: flex; justify-content: center; }
    .mk-phone {
      width: 100%; max-width: 340px; border-radius: 22px; background: #0E1015;
      border: 1px solid var(--mk-line-dark); padding: 4px; box-shadow: 0 30px 60px -20px rgba(0,0,0,0.5);
      animation: mk-float 6s ease-in-out infinite;
    }
    @keyframes mk-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
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
    /* Se a animação estiver desligada (movimento reduzido, ou qualquer outro motivo),
       o conteúdo nunca pode ficar invisível — a animação é só um enfeite opcional. */
    @media (prefers-reduced-motion: reduce) {
      .mk-bubble, .mk-phone__tag { opacity: 1 !important; transform: none !important; animation: none !important; }
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
    .mk-anim-2 { animation-delay: 0.55s; }
    .mk-anim-3 { animation-delay: 1.1s; }
    .mk-phone__tag {
      align-self: flex-end; font-size: 11px; color: var(--mk-forest); font-weight: 600;
      opacity: 0; animation: mk-rise 0.5s ease forwards; animation-delay: 1.5s;
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

    /* --- vitrine do produto --- */
    .mk-showcase { background: var(--mk-ink); padding: 0 32px 110px; text-align: center; }
    .mk-showcase__frame {
      max-width: 900px; margin: 0 auto; border-radius: 14px; overflow: hidden;
      background: var(--mk-cream); box-shadow: 0 50px 90px -30px rgba(0,0,0,0.55);
      border: 1px solid var(--mk-line-dark);
    }
    .mk-browser {
      display: flex; align-items: center; gap: 7px; padding: 12px 16px; background: #1E222B;
    }
    .mk-browser__dot { width: 9px; height: 9px; border-radius: 50%; background: #3A404C; }
    .mk-browser__url {
      margin-left: 12px; font-size: 12px; color: var(--mk-ink-soft); font-family: var(--font-code);
    }

    .mk-dash { padding: 28px; text-align: left; }
    .mk-dash__attention {
      display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
      padding: 20px 22px; margin-bottom: 20px; border-radius: 10px;
      background: #FBF3E4; border-left: 4px solid var(--mk-brass);
    }
    .mk-dash__big { font-family: var(--font-serif); font-size: 44px; font-weight: 600; color: var(--mk-brass); line-height: 1; }
    .mk-dash__attention span:not(.mk-dash__big) { font-size: 15px; font-weight: 500; color: var(--mk-text); }
    .mk-dash__aside { margin-left: auto !important; font-size: 13px !important; font-weight: 400 !important; color: var(--mk-text-soft) !important; }

    .mk-dash__stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .mk-dash__stat {
      background: #fff; border: 1px solid var(--mk-line-light); border-radius: 8px; padding: 14px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .mk-dash__stat span { font-size: 12px; color: var(--mk-text-soft); }
    .mk-dash__stat strong { font-size: 22px; font-weight: 600; }

    .mk-dash__funnel { display: flex; flex-direction: column; gap: 8px; }
    .mk-dash__bar {
      background: var(--mk-forest); color: #fff; font-size: 12px; font-weight: 500;
      padding: 8px 12px; border-radius: 4px;
    }

    .mk-showcase__caption { margin: 20px 0 0; color: var(--mk-ink-soft); font-size: 14px; }

    /* --- sections --- */
    .mk-section--light { background: var(--mk-paper); padding: 88px 32px; }
    .mk-section__inner { max-width: 1180px; margin: 0 auto; }
    .mk-h2 { font-size: 30px; line-height: 1.25; margin: 0 0 12px; max-width: 26ch; }
    .mk-h2--inverse { color: var(--mk-paper); }

    /* --- steps (legitimamente sequencial, numerado) --- */
    .mk-steps { list-style: none; margin: 48px 0 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
    .mk-steps li { display: flex; flex-direction: column; gap: 10px; }
    .mk-steps__n {
      font-family: var(--font-serif); font-size: 15px; font-weight: 600; color: var(--mk-brass);
      border: 1px solid var(--mk-brass); width: 30px; height: 30px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.25s ease, color 0.25s ease;
    }
    .mk-steps li:hover .mk-steps__n { background: var(--mk-brass); color: #1A1305; }
    .mk-steps h3 { font-size: 17px; margin: 0 0 4px; }
    .mk-steps p { margin: 0; color: var(--mk-text-soft); font-size: 14px; line-height: 1.55; }

    /* --- feature rows (assimetricas, alternadas) --- */
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
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .mk-feature:hover .mk-feature__visual { transform: translateY(-4px); box-shadow: 0 20px 40px -24px rgba(23,26,33,0.25); }
    .mk-visual__card { display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
    .mk-visual__code { font-family: var(--font-code); font-size: 12px; color: var(--mk-brass); letter-spacing: 0.03em; }
    .mk-visual__note { color: var(--mk-text-soft); font-size: 13px; }

    .mk-visual__stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .mk-visual__big { font-family: var(--font-serif); font-size: 64px; color: var(--mk-forest); line-height: 1; }

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
    .mk-footer-full { background: var(--mk-cream); border-top: 1px solid var(--mk-line-light); }
    .mk-footer-full__inner {
      max-width: 1180px; margin: 0 auto; padding: 56px 32px 40px;
      display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 40px;
    }
    .mk-footer-full__brand p { margin: 10px 0 0; color: var(--mk-text-soft); font-size: 14px; max-width: 32ch; }
    .mk-footer-full__col h3 { margin: 0 0 14px; font-size: 13px; font-weight: 600; color: var(--mk-text-soft); }
    .mk-footer-full__col ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .mk-footer-full__col a { color: var(--mk-text); font-size: 14px; text-decoration: none; }
    .mk-footer-full__col a:hover { color: var(--mk-brass); text-decoration: none; }
    .mk-footer-full__bottom {
      max-width: 1180px; margin: 0 auto; padding: 20px 32px; border-top: 1px solid var(--mk-line-light);
      color: var(--mk-text-soft); font-size: 12.5px;
    }

    /* --- botao flutuante --- */
    .mk-fab {
      position: fixed; right: 20px; bottom: 20px; z-index: 20;
      display: flex; align-items: center; gap: 8px;
      background: var(--mk-whatsapp); color: #fff; text-decoration: none;
      padding: 12px 16px; border-radius: 100px; box-shadow: 0 12px 28px -8px rgba(37,211,102,0.55);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .mk-fab:hover { transform: translateY(-3px); box-shadow: 0 16px 32px -8px rgba(37,211,102,0.6); text-decoration: none; }
    .mk-fab__icon { display: flex; }
    .mk-fab__label { font-size: 13px; font-weight: 600; }

    @media (max-width: 900px) {
      .mk-hero__grid { grid-template-columns: 1fr; gap: 40px; }
      .mk-h1 { font-size: 32px; }
      .mk-nav__links { display: none; }
      .mk-steps { grid-template-columns: 1fr 1fr; }
      .mk-feature, .mk-feature--reverse .mk-feature__text { grid-template-columns: 1fr; order: initial; }
      .mk-feature { grid-template-columns: 1fr; }
      .mk-dash__stats { grid-template-columns: 1fr 1fr; }
      .mk-btn--nav { display: none; }
      .mk-footer-full__inner { grid-template-columns: 1fr; gap: 28px; }
    }
    @media (max-width: 560px) {
      .mk-steps { grid-template-columns: 1fr; }
      .mk-fab__label { display: none; }
      .mk-fab { padding: 14px; }
    }
  `],
})
export class LandingComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly whatsappUrl = WHATSAPP_URL;
  readonly currentYear = new Date().getFullYear();

  ngOnInit(): void {
    // Quem já está logado não precisa ver a landing de novo.
    if (this.auth.isAuthenticated()) void this.router.navigate(["/painel"]);
  }
}
