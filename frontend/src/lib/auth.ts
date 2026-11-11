export type Usuario = { nombre: string; correo: string; password: string };

const CLAVE_USUARIOS = "terrasim_usuarios";
const CLAVE_SESION = "terrasim_sesion";

function leerUsuarios(): Usuario[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_USUARIOS) ?? "[]");
  } catch {
    return [];
  }
}

export function registrar(u: Usuario): { ok: boolean; error?: string } {
  const usuarios = leerUsuarios();
  const correo = u.correo.trim().toLowerCase();
  if (usuarios.some((x) => x.correo === correo)) {
    return { ok: false, error: "Ya existe una cuenta con ese correo." };
  }
  usuarios.push({ ...u, correo });
  localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuarios));
  localStorage.setItem(CLAVE_SESION, correo);
  return { ok: true };
}

export function iniciarSesion(correo: string, password: string): { ok: boolean; error?: string } {
  const c = correo.trim().toLowerCase();
  const usuario = leerUsuarios().find((x) => x.correo === c && x.password === password);
  if (!usuario) return { ok: false, error: "Correo o contraseña incorrectos." };
  localStorage.setItem(CLAVE_SESION, c);
  return { ok: true };
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION);
}

export function usuarioActual(): Usuario | null {
  const correo = localStorage.getItem(CLAVE_SESION);
  if (!correo) return null;
  return leerUsuarios().find((x) => x.correo === correo) ?? null;
}