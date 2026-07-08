/**
 * @fileoverview Greek letters and mathematical symbols for LaTeX rendering
 * @module plugins/latex/symbols
 */

/**
 * Greek letters mapping (lowercase)
 */
export const GREEK_LOWERCASE: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  omicron: 'ο',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
};

/**
 * Greek letters mapping (uppercase)
 */
export const GREEK_UPPERCASE: Record<string, string> = {
  Alpha: 'Α',
  Beta: 'Β',
  Gamma: 'Γ',
  Delta: 'Δ',
  Epsilon: 'Ε',
  Zeta: 'Ζ',
  Eta: 'Η',
  Theta: 'Θ',
  Iota: 'Ι',
  Kappa: 'Κ',
  Lambda: 'Λ',
  Mu: 'Μ',
  Nu: 'Ν',
  Xi: 'Ξ',
  Omicron: 'Ο',
  Pi: 'Π',
  Rho: 'Ρ',
  Sigma: 'Σ',
  Tau: 'Τ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Chi: 'Χ',
  Psi: 'Ψ',
  Omega: 'Ω',
};

/**
 * Mathematical operators
 */
export const MATH_OPERATORS: Record<string, string> = {
  sum: '∑',
  prod: '∏',
  int: '∫',
  oint: '∮',
  partial: '∂',
  nabla: '∇',
  infty: '∞',
  hbar: 'ℏ',
  pm: '±',
  mp: '∓',
  times: '×',
  div: '÷',
  cdot: '·',
  ast: '∗',
  star: '⋆',
  circ: '∘',
  bullet: '•',
  cap: '∩',
  cup: '∪',
  vee: '∨',
  wedge: '∧',
  oplus: '⊕',
  otimes: '⊗',
  equiv: '≡',
  cong: '≅',
  approx: '≈',
  propto: '∝',
  neq: '≠',
  leq: '≤',
  geq: '≥',
  ll: '≪',
  gg: '≫',
  subset: '⊂',
  supset: '⊃',
  subseteq: '⊆',
  supseteq: '⊇',
  in: '∈',
  notin: '∉',
  ni: '∋',
  forall: '∀',
  exists: '∃',
  emptyset: '∅',
  neg: '¬',
  angle: '∠',
  perp: '⊥',
  parallel: '∥',
  rightarrow: '→',
  leftarrow: '←',
  leftrightarrow: '↔',
  Rightarrow: '⇒',
  Leftarrow: '⇐',
  Leftrightarrow: '⇔',
  mapsto: '↦',
  to: '→',
  langle: '⟨',
  rangle: '⟩',
  rightleftharpoons: '⇌',
  log: 'log',
  ln: 'ln',
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
};

/**
 * Greek letter variants
 */
export const GREEK_VARIANTS: Record<string, string> = {
  varepsilon: 'ϵ',
  vartheta: 'ϑ',
  varkappa: 'ϰ',
  varphi: 'φ',
  varpi: 'ϖ',
  varrho: 'ϱ',
  varsigma: 'ς',
  digamma: 'ϝ',
  varDelta: 'Δ',
  varGamma: 'Γ',
  varSigma: 'Σ',
  varOmega: 'Ω',
  varPhi: 'Φ',
  varPi: 'Π',
  varLambda: 'Λ',
  varTheta: 'Θ',
  varUpsilon: 'Υ',
  varXi: 'Ξ',
  varPsi: 'Ψ',
};

/**
 * Arrow symbols
 */
export const ARROWS: Record<string, string> = {
  uparrow: '↑',
  downarrow: '↓',
  updownarrow: '↕',
  Uparrow: '⇑',
  Downarrow: '⇓',
  Updownarrow: '⇕',
  nearrow: '↗',
  searrow: '↘',
  swarrow: '↙',
  nwarrow: '↖',
  longrightarrow: '⟶',
  longleftarrow: '⟵',
  longleftrightarrow: '⟷',
  Longrightarrow: '⟹',
  Longleftarrow: '⟸',
  Longleftrightarrow: '⟺',
  implies: '⟹',
  impliedby: '⟸',
  iff: '⟺',
  hookrightarrow: '↪',
  hookleftarrow: '↩',
  twoheadrightarrow: '↠',
  twoheadleftarrow: '↞',
  rightarrowtail: '↣',
  leftarrowtail: '↢',
  rightleftarrows: '⇄',
  leftrightarrows: '⇆',
  rightrightarrows: '⇉',
  leftleftarrows: '⇇',
  upuparrows: '⇈',
  downdownarrows: '⇊',
  leadsto: '⇝',
  rightsquigarrow: '⇝',
  leftrightsquigarrow: '↭',
  circlearrowleft: '↺',
  circlearrowright: '↻',
  curvearrowleft: '↶',
  curvearrowright: '↷',
  Rrightarrow: '⇛',
  Lleftarrow: '⇚',
  dashrightarrow: '⇢',
  dashleftarrow: '⇠',
  nrightarrow: '↛',
  nleftarrow: '↚',
  nLeftrightarrow: '⇎',
  nRightarrow: '⇏',
  nLeftarrow: '⇍',
  restriction: '↾',
  upharpoonright: '↾',
  upharpoonleft: '↿',
  downharpoonright: '⇂',
  downharpoonleft: '⇃',
  leftharpoonup: '↼',
  leftharpoondown: '↽',
  rightharpoonup: '⇀',
  rightharpoondown: '⇁',
  leftrightharpoons: '⇋',
};

/**
 * Relation symbols
 */
export const RELATIONS: Record<string, string> = {
  sim: '∼',
  simeq: '≃',
  asymp: '≍',
  approxeq: '≊',
  doteq: '≐',
  prec: '≺',
  succ: '≻',
  preceq: '⪯',
  succeq: '⪰',
  precsim: '≾',
  succsim: '≿',
  ll: '≪',
  gg: '≫',
  lll: '⋘',
  ggg: '⋙',
  models: '⊨',
  vdash: '⊢',
  dashv: '⊣',
  vDash: '⊨',
  Vdash: '⊩',
  Vvdash: '⊪',
  smile: '⌣',
  frown: '⌢',
  bowtie: '⋈',
  sqsubset: '⊏',
  sqsupset: '⊐',
  sqsubseteq: '⊑',
  sqsupseteq: '⊒',
  subsetneq: '⊊',
  supsetneq: '⊋',
  Subset: '⋐',
  Supset: '⋑',
  between: '≬',
  pitchfork: '⋔',
  therefore: '∴',
  because: '∵',
  eqcirc: '≖',
  circeq: '≗',
  triangleq: '≜',
  gtrless: '≷',
  lessgtr: '≶',
  lesssim: '≲',
  gtrsim: '≳',
  lessdot: '⋖',
  gtrdot: '⋗',
  ne: '≠',
  nless: '≮',
  ngtr: '≯',
  nleq: '≰',
  ngeq: '≱',
  nsim: '≁',
  nmid: '∤',
  nparallel: '∦',
  nsubseteq: '⊈',
  nsupseteq: '⊉',
  nsubset: '⊄',
  nsupset: '⊅',
  nvdash: '⊬',
  nvDash: '⊭',
  precnsim: '⋨',
  succnsim: '⋩',
  mid: '∣',
  shortmid: '∣',
  varpropto: '∝',
  backsim: '∽',
  eqsim: '≂',
  Doteq: '≑',
  fallingdotseq: '≒',
  risingdotseq: '≓',
};

/**
 * Binary operators
 */
export const BINARY_OPERATORS: Record<string, string> = {
  setminus: '∖',
  smallsetminus: '∖',
  wr: '≀',
  amalg: '⨿',
  uplus: '⊎',
  sqcap: '⊓',
  sqcup: '⊔',
  triangleleft: '◁',
  triangleright: '▷',
  bigtriangleup: '△',
  bigtriangledown: '▽',
  triangledown: '▿',
  diamond: '⋄',
  ominus: '⊖',
  oslash: '⊘',
  odot: '⊙',
  bigcirc: '◯',
  boxplus: '⊞',
  boxminus: '⊟',
  boxtimes: '⊠',
  boxdot: '⊡',
  ltimes: '⋉',
  rtimes: '⋊',
  divideontimes: '⋇',
  dagger: '†',
  ddagger: '‡',
  intercal: '⊺',
  curlyvee: '⋎',
  curlywedge: '⋏',
  barwedge: '⊼',
  veebar: '⊻',
  doublebarwedge: '⩞',
  circledast: '⊛',
  circledcirc: '⊚',
  circleddash: '⊝',
  lesseqgtr: '⋚',
  gtreqless: '⋛',
  dotplus: '∔',
  centerdot: '·',
};

/**
 * Large operators
 */
export const BIG_OPERATORS: Record<string, string> = {
  bigcup: '⋃',
  bigcap: '⋂',
  bigsqcup: '⨆',
  biguplus: '⨄',
  bigvee: '⋁',
  bigwedge: '⋀',
  bigoplus: '⨁',
  bigotimes: '⨂',
  bigodot: '⨀',
  coprod: '∐',
  iint: '∬',
  iiint: '∭',
  iiiint: '⨌',
  oiint: '∯',
  oiiint: '∰',
};

/**
 * Miscellaneous symbols
 */
export const MISC_SYMBOLS: Record<string, string> = {
  aleph: 'ℵ',
  beth: 'ℶ',
  gimel: 'ℷ',
  daleth: 'ℸ',
  ell: 'ℓ',
  wp: '℘',
  Re: 'ℜ',
  Im: 'ℑ',
  imath: 'ı',
  jmath: 'ȷ',
  hslash: 'ℏ',
  surd: '√',
  top: '⊤',
  bot: '⊥',
  measuredangle: '∡',
  sphericalangle: '∢',
  triangle: '△',
  blacktriangle: '▲',
  blacktriangledown: '▼',
  blacktriangleleft: '◀',
  blacktriangleright: '▶',
  square: '□',
  blacksquare: '■',
  lozenge: '◊',
  blacklozenge: '⧫',
  bigstar: '★',
  backslash: '\\',
  prime: '′',
  dprime: '″',
  backprime: '‵',
  varnothing: '∅',
  complement: '∁',
  degree: '°',
  flat: '♭',
  natural: '♮',
  sharp: '♯',
  clubsuit: '♣',
  diamondsuit: '♢',
  heartsuit: '♡',
  spadesuit: '♠',
  checkmark: '✓',
  maltese: '✠',
  copyright: '©',
  circledR: '®',
  circledS: 'Ⓢ',
  pounds: '£',
  yen: '¥',
  euro: '€',
  cent: '¢',
  S: '§',
  P: '¶',
  dag: '†',
  ddag: '‡',
  sun: '☉',
  mercury: '☿',
  venus: '♀',
  earth: '♁',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  partialdiff: '∂',
  Finv: 'Ⅎ',
  Game: '⅁',
  mho: '℧',
  eth: 'ð',
  hbar2: 'ℏ',
  nexists: '∄',
  angstrom: 'Å',
  micro: 'µ',
  ohm: 'Ω',
  perthousand: '‰',
  numero: '№',
};

/**
 * Dots and ellipses
 */
export const DOTS: Record<string, string> = {
  ldots: '…',
  cdots: '⋯',
  vdots: '⋮',
  ddots: '⋱',
  dots: '…',
  dotsc: '…',
  dotsb: '⋯',
  dotsm: '⋯',
  dotsi: '⋯',
};

/**
 * Delimiters
 */
export const DELIMITERS: Record<string, string> = {
  lfloor: '⌊',
  rfloor: '⌋',
  lceil: '⌈',
  rceil: '⌉',
  lbrace: '{',
  rbrace: '}',
  lbrack: '[',
  rbrack: ']',
  lvert: '|',
  rvert: '|',
  lVert: '‖',
  rVert: '‖',
  vert: '|',
  Vert: '‖',
  ulcorner: '⌜',
  urcorner: '⌝',
  llcorner: '⌞',
  lrcorner: '⌟',
  lgroup: '⟮',
  rgroup: '⟯',
  lmoustache: '⎰',
  rmoustache: '⎱',
  llbracket: '⟦',
  rrbracket: '⟧',
};

/**
 * Named functions (rendered as upright text)
 */
export const FUNCTIONS: Record<string, string> = {
  sec: 'sec',
  csc: 'csc',
  cot: 'cot',
  sinh: 'sinh',
  cosh: 'cosh',
  tanh: 'tanh',
  coth: 'coth',
  arcsin: 'arcsin',
  arccos: 'arccos',
  arctan: 'arctan',
  arcsec: 'arcsec',
  arccsc: 'arccsc',
  arccot: 'arccot',
  exp: 'exp',
  det: 'det',
  dim: 'dim',
  ker: 'ker',
  deg: 'deg',
  gcd: 'gcd',
  hom: 'hom',
  lim: 'lim',
  liminf: 'lim inf',
  limsup: 'lim sup',
  max: 'max',
  min: 'min',
  sup: 'sup',
  inf: 'inf',
  arg: 'arg',
  Pr: 'Pr',
  lg: 'lg',
  mod: 'mod',
  bmod: 'mod',
};

/**
 * All symbols combined
 */
export const ALL_SYMBOLS: Record<string, string> = {
  ...GREEK_LOWERCASE,
  ...GREEK_UPPERCASE,
  ...GREEK_VARIANTS,
  ...MATH_OPERATORS,
  ...ARROWS,
  ...RELATIONS,
  ...BINARY_OPERATORS,
  ...BIG_OPERATORS,
  ...MISC_SYMBOLS,
  ...DOTS,
  ...DELIMITERS,
  ...FUNCTIONS,
};

/**
 * Blackboard-bold (\mathbb) letter map
 */
export const BLACKBOARD: Record<string, string> = {
  A: '𝔸', B: '𝔹', C: 'ℂ', D: '𝔻', E: '𝔼', F: '𝔽', G: '𝔾', H: 'ℍ',
  I: '𝕀', J: '𝕁', K: '𝕂', L: '𝕃', M: '𝕄', N: 'ℕ', O: '𝕆', P: 'ℙ',
  Q: 'ℚ', R: 'ℝ', S: '𝕊', T: '𝕋', U: '𝕌', V: '𝕍', W: '𝕎', X: '𝕏',
  Y: '𝕐', Z: 'ℤ',
};

/**
 * Calligraphic (\mathcal) letter map
 */
export const CALLIGRAPHIC: Record<string, string> = {
  A: '𝒜', B: 'ℬ', C: '𝒞', D: '𝒟', E: 'ℰ', F: 'ℱ', G: '𝒢', H: 'ℋ',
  I: 'ℐ', J: '𝒥', K: '𝒦', L: 'ℒ', M: 'ℳ', N: '𝒩', O: '𝒪', P: '𝒫',
  Q: '𝒬', R: 'ℛ', S: '𝒮', T: '𝒯', U: '𝒰', V: '𝒱', W: '𝒲', X: '𝒳',
  Y: '𝒴', Z: '𝒵',
};

/**
 * Fraktur (\mathfrak) letter map
 */
export const FRAKTUR: Record<string, string> = {
  A: '𝔄', B: '𝔅', C: 'ℭ', D: '𝔇', E: '𝔈', F: '𝔉', G: '𝔊', H: 'ℌ',
  I: 'ℑ', J: '𝔍', K: '𝔎', L: '𝔏', M: '𝔐', N: '𝔑', O: '𝔒', P: '𝔓',
  Q: '𝔔', R: 'ℜ', S: '𝔖', T: '𝔗', U: '𝔘', V: '𝔙', W: '𝔚', X: '𝔛',
  Y: '𝔜', Z: 'ℨ',
};

/** Total number of directly-mapped LaTeX commands (excludes alphabet maps). */
export const SYMBOL_COUNT = Object.keys(ALL_SYMBOLS).length;

/**
 * Get Unicode symbol for a LaTeX command
 */
export function getSymbol(command: string): string | undefined {
  return ALL_SYMBOLS[command];
}

/**
 * Check if a command is a known symbol
 */
export function isSymbol(command: string): boolean {
  return command in ALL_SYMBOLS;
}
