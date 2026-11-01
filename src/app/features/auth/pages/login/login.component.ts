import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;

  hideLoginPassword = signal(true);
  hideRecoveryPassword = signal(true);
  mostrarReglasRecuperar = signal(false);
  private reglasTimerRecuperar: any;

  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  mostrarRecuperar = signal(false);
  correoEnviado = signal(false);
  codigoValido = signal(false);
  codigoIngresado = '';
  segundosRestantes = signal(0);
  private contador: any;

  mensajeRecuperar = signal('');
  cuentaRecuperar = '';
  correoRecuperar = '';
  claveNueva = '';
  confirmarClaveNueva = '';

  captchaA = 0;
  captchaB = 0;
  respuestaCaptcha = '';
  captchaRecuperarA = 0;
  captchaRecuperarB = 0;
  respuestaCaptchaRecuperar = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      cuenta: ['', [Validators.required, Validators.minLength(4)]],
      clave: ['', [Validators.required, Validators.minLength(4)]],
      rememberMe: [false]
    });
    this.nuevaSumaLogin();
    this.nuevaSumaRecuperar();
  }

  ngOnInit(): void {
    const savedUser = localStorage.getItem('remembered_cuenta');
    if (savedUser) {
      this.loginForm.patchValue({ cuenta: savedUser, rememberMe: true });
    }
  }

  activarReglasRecuperar(): void {
    if (this.reglasTimerRecuperar) {
      clearTimeout(this.reglasTimerRecuperar);
      this.reglasTimerRecuperar = null;
    }
    this.mostrarReglasRecuperar.set(true);
  }

  ocultarReglasRecuperar(): void {
    this.reglasTimerRecuperar = setTimeout(() => this.mostrarReglasRecuperar.set(false), 200);
  }

  tieneMinimo(valor: string): boolean { return (valor || '').length >= 8; }
  tieneMayuscula(valor: string): boolean { return /[A-Z]/.test(valor || ''); }
  tieneNumero(valor: string): boolean { return /[0-9]/.test(valor || ''); }
  tieneSimbolo(valor: string): boolean { return /[^A-Za-z0-9]/.test(valor || ''); }

  toggleLoginPasswordVisibility(): void { this.hideLoginPassword.update(v => !v); }
  toggleRecoveryPasswordVisibility(): void { this.hideRecoveryPassword.update(v => !v); }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.errorMessage.set('');
    this.isLoading.set(true);

    if (!this.captchaLoginValido()) {
      this.isLoading.set(false);
      this.errorMessage.set('Captcha incorrecto. Resuelva la suma.');
      this.nuevaSumaLogin();
      return;
    }

    const { cuenta, clave, rememberMe } = this.loginForm.value;
    if (rememberMe) localStorage.setItem('remembered_cuenta', cuenta);
    else localStorage.removeItem('remembered_cuenta');

    this.authService.login({ cuenta, clave }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const roles: string[] = res?.roles ?? [];
        this.router.navigate([this.rutaSegunRol(roles)]);
      },
      error: (err) => {
        this.isLoading.set(false);
        const mensaje = typeof err.error === 'string' ? err.error : '';
        if (mensaje) this.errorMessage.set(mensaje);
        else if (err.status === 401 || err.status === 400) this.errorMessage.set('Usuario o contraseña incorrectos.');
        else this.errorMessage.set('Error de conexión con el servidor. Intente nuevamente.');
      }
    });
  }

  private rutaSegunRol(roles: string[]): string {
    const tiene = (rol: string) => roles.some(r => r.toUpperCase().includes(rol));
    if (tiene('ADMIN_SISTEMA')) return '/usuarios';
    if (tiene('ALMACENERO')) return '/productos';
    return '/clientes';
  }

  //ENVIO DE CODIGO DE RECUPERACION
  enviarCodigo(): void {
  const correo = (this.correoRecuperar || '').trim();
  const formatoValido = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(correo);
  if (!formatoValido) {
    this.mensajeRecuperar.set('Ingrese un correo válido, con @ y punto.');
    return;
  }
  if (this.segundosRestantes() > 0) return;

  this.authService.solicitarCodigo(correo).subscribe({
    next: () => {
      this.correoEnviado.set(true);
      this.codigoValido.set(false);
      this.codigoIngresado = '';
      this.segundosRestantes.set(180);
      this.mensajeRecuperar.set('');
      clearInterval(this.contador);
      this.contador = setInterval(() => {
        const n = this.segundosRestantes() - 1;
        this.segundosRestantes.set(n);
        if (n <= 0) clearInterval(this.contador);
      }, 1000);
    },
    error: (err) => {
      const texto = typeof err.error === 'string' ? err.error : 'No se pudo enviar el código.';
      this.mensajeRecuperar.set(texto);
    }
  });
}
  

validarCodigo(): void {
  this.authService.validarCodigo(this.correoRecuperar, this.codigoIngresado).subscribe({
    next: () => {
      this.codigoValido.set(true);
      this.mensajeRecuperar.set('');
    },
    error: (err) => {
      const texto = typeof err.error === 'string' ? err.error : 'Código incorrecto.';
      this.mensajeRecuperar.set(texto);
    }
  });
}

//

  volverAlLogin(): void {
    this.mostrarRecuperar.set(false);
    this.correoEnviado.set(false);
    this.codigoValido.set(false);
    this.mensajeRecuperar.set('');
    this.nuevaSumaLogin();
  }

  
  recuperarClave(): void {
  if (this.claveNueva !== this.confirmarClaveNueva) {
    this.mensajeRecuperar.set('Las claves no coinciden.');
    return;
  }
  if (!this.tieneMinimo(this.claveNueva) || !this.tieneMayuscula(this.claveNueva)
      || !this.tieneNumero(this.claveNueva) || !this.tieneSimbolo(this.claveNueva)) {
    this.mensajeRecuperar.set('La clave no cumple los requisitos.');
    return;
  }

  this.authService.cambiarClave(this.correoRecuperar, this.codigoIngresado, this.claveNueva)
    .subscribe({
      next: () => {
        this.mensajeRecuperar.set('Se realizó el cambio de clave. Ya puede iniciar sesión.');
        this.claveNueva = '';
        this.confirmarClaveNueva = '';
      },
      error: (err) => {
        const texto = typeof err.error === 'string' ? err.error : 'No se pudo cambiar la clave.';
        this.mensajeRecuperar.set(texto);
      }
    });
}
    

  cerrarAvisoRecuperar(): void {
    const fueExito = this.mensajeRecuperar().includes('cambio de clave');
    this.mensajeRecuperar.set('');
    if (fueExito) {
      this.mostrarRecuperar.set(false);
      this.correoEnviado.set(false);
      this.codigoValido.set(false);
      this.nuevaSumaLogin();
    }
  }

  nuevaSumaLogin(): void {
    this.captchaA = Math.floor(Math.random() * 9) + 1;
    this.captchaB = Math.floor(Math.random() * 9) + 1;
    this.respuestaCaptcha = '';
  }

  nuevaSumaRecuperar(): void {
    this.captchaRecuperarA = Math.floor(Math.random() * 9) + 1;
    this.captchaRecuperarB = Math.floor(Math.random() * 9) + 1;
    this.respuestaCaptchaRecuperar = '';
  }

  private captchaLoginValido(): boolean {
    return Number(this.respuestaCaptcha) === this.captchaA + this.captchaB;
  }

  private captchaRecuperarValido(): boolean {
    return Number(this.respuestaCaptchaRecuperar) === this.captchaRecuperarA + this.captchaRecuperarB;
  }
}