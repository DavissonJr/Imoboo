import { Directive, ElementRef, Renderer2, forwardRef } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";

const CURRENCY_FORMAT = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Máscara de moeda para reactive forms. O usuário digita só números, como numa
 * calculadora (da direita para a esquerda), e vê "1.234,56" formatado; o
 * FormControl por trás continua guardando um number puro (1234.56), nunca texto.
 *
 * Uso: <input type="text" inputmode="numeric" appCurrencyMask formControlName="salePrice" />
 */
@Directive({
  selector: "[appCurrencyMask]",
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyMaskDirective),
      multi: true,
    },
  ],
  host: {
    "(input)": "onInput($event)",
    "(blur)": "onTouched()",
  },
})
export class CurrencyMaskDirective implements ControlValueAccessor {
  private onChange: (value: number | null) => void = () => {};
  onTouched: () => void = () => {};

  constructor(
    private readonly el: ElementRef<HTMLInputElement>,
    private readonly renderer: Renderer2,
  ) {}

  writeValue(value: number | null): void {
    this.setDisplay(value === null || value === undefined ? "" : CURRENCY_FORMAT.format(value));
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.el.nativeElement, "disabled", isDisabled);
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, "");

    if (digits.length === 0) {
      this.setDisplay("");
      this.onChange(null);
      return;
    }

    const numeric = Number(digits) / 100;
    this.setDisplay(CURRENCY_FORMAT.format(numeric));
    this.onChange(numeric);

    // Os dígitos entram sempre pela direita (estilo calculadora), então o
    // cursor deve ficar no fim do texto após reformatar a cada tecla.
    const end = input.value.length;
    queueMicrotask(() => input.setSelectionRange(end, end));
  }

  private setDisplay(text: string): void {
    this.renderer.setProperty(this.el.nativeElement, "value", text);
  }
}
