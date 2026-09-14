import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from "@angular/core";

/**
 * Adiciona a classe "is-visible" quando o elemento entra na viewport, e para
 * de observar depois (a revelação acontece uma vez, não fica piscando ao
 * rolar pra cima e pra baixo). O CSS de cada seção decide a transição —
 * a diretiva só liga o gatilho.
 *
 * Garantia: mesmo que o IntersectionObserver nunca dispare por algum motivo
 * (elemento em contexto de layout incomum, navegador estranho etc.), um prazo
 * máximo força a revelação de qualquer forma. Conteúdo nunca deve depender
 * só de um efeito visual para existir na tela.
 */
@Directive({
  selector: "[appScrollReveal]",
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;
  private fallbackTimer?: ReturnType<typeof setTimeout>;

  /** Atraso opcional em ms, para escalonar itens dentro da mesma seção. */
  readonly appScrollReveal = input<number>(0);

  ngOnInit(): void {
    const element = this.el.nativeElement;

    if (typeof IntersectionObserver === "undefined") {
      element.classList.add("is-visible");
      return;
    }

    const reveal = () => {
      if (element.classList.contains("is-visible")) return;
      element.classList.add("is-visible");
      this.observer?.unobserve(element);
    };

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const delay = this.appScrollReveal();
          if (delay > 0) element.style.transitionDelay = `${delay}ms`;

          reveal();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );

    this.observer.observe(element);

    // Rede de segurança: se por algum motivo o observer nunca disparar,
    // o conteúdo aparece sozinho depois de 2s em vez de ficar invisível.
    this.fallbackTimer = setTimeout(reveal, 2000);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.fallbackTimer) clearTimeout(this.fallbackTimer);
  }
}
