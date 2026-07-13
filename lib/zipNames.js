// Nume UNICE pentru intrările dintr-o arhivă ZIP.
//
// De ce: JSZip SUPRASCRIE intrările cu același nume. Doi invitați pot avea poze cu
// nume identic (IMG_1234.jpg de pe telefoane diferite) → se pierdeau fișiere în tăcere.
// Confirmat pe date reale: un eveniment cu 205 fișiere avea doar 199 nume unice.
//
// Comparăm CASE-INSENSITIVE, pentru că Windows/macOS tratează „Foto.JPG" și „foto.jpg"
// ca același fișier la dezarhivare — altfel s-ar suprascrie tot.
//
// Determinist: primul păstrează numele original, următoarele primesc „ (2)", „ (3)"…
// Extensia se păstrează întotdeauna: „poza.jpg" → „poza (2).jpg".

export function createZipNamer() {
  const used = new Set(); // chei normalizate (lowercase)

  return function uniqueName(rawName, fallbackId) {
    const base = String(rawName ?? '').trim() || `fisier_${fallbackId}`;

    const dot = base.lastIndexOf('.');
    const hasExt = dot > 0; // „.gitignore" (dot === 0) NU e extensie
    const stem = hasExt ? base.slice(0, dot) : base;
    const ext = hasExt ? base.slice(dot) : '';

    let candidate = base;
    let n = 1;
    while (used.has(candidate.toLowerCase())) {
      n++;
      candidate = `${stem} (${n})${ext}`;
    }

    used.add(candidate.toLowerCase());
    return candidate;
  };
}
