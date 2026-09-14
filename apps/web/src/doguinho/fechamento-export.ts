export type FechamentoExportProduto = {
  id: string;
  nome: string;
  unidade: string;
  ativo: boolean;
};

export type FechamentoExportLinha = {
  produtoId: string;
  restante: number | null;
};

export type FechamentoExportEnvio = {
  tipo: "fechamento" | "correcao";
  usuarioNome: string;
  justificativa: string | null;
  produtoNomes: Record<string, string>;
  linhas: Array<{ produtoId: string; anterior: number | null; nova: number }>;
};

export type FechamentoExportSecao = {
  lojaNome: string;
  produtos: FechamentoExportProduto[];
  linhas: FechamentoExportLinha[];
  envios: FechamentoExportEnvio[];
};

export type CelulaPlanilha = string | number;

// ASVS 1.2.4: neutralize spreadsheet formula injection in user-controlled cells
function celulaSegura(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

export function montarPlanilhaFechamento(secoes: FechamentoExportSecao[]): CelulaPlanilha[][] {
  const rows: CelulaPlanilha[][] = [];
  for (const secao of secoes) {
    if (rows.length > 0) rows.push([]);
    rows.push(["Fechamento", secao.lojaNome]);
    rows.push(["Produto", "Unidade", "Quantidade restante"]);
    const porId = new Map(secao.linhas.map((linha) => [linha.produtoId, linha.restante]));
    for (const produto of secao.produtos.filter((item) => item.ativo)) {
      const restante = porId.get(produto.id);
      rows.push([
        celulaSegura(produto.nome),
        produto.unidade,
        restante === null || restante === undefined ? "" : restante,
      ]);
    }
    rows.push([]);
    rows.push(["Envios de hoje"]);
    rows.push(["Tipo", "Autor", "Produto", "Anterior", "Nova", "Diferença", "Justificativa"]);
    for (const envio of secao.envios) {
      const tipo = envio.tipo === "correcao" ? "Correção" : "Fechamento";
      for (const linha of envio.linhas) {
        const diferenca = linha.anterior === null ? "" : linha.nova - linha.anterior;
        rows.push([
          tipo,
          celulaSegura(envio.usuarioNome),
          celulaSegura(envio.produtoNomes[linha.produtoId] ?? linha.produtoId),
          linha.anterior === null ? "" : linha.anterior,
          linha.nova,
          diferenca,
          envio.justificativa ? celulaSegura(envio.justificativa) : "",
        ]);
      }
    }
  }
  return rows;
}

function slugLoja(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function nomeArquivoFechamento(formato: "xlsx" | "pdf", recorte: string): string {
  if (recorte === "todas") return `fechamento-hoje.${formato}`;
  return `fechamento-hoje-${slugLoja(recorte)}.${formato}`;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files: Array<{ name: string; data: Buffer }>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const crc = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(file.data.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, file.data);
    centrals.push(central, name);
    offset += local.length + name.length + file.data.length;
  }
  const centralDir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDir, end]);
}

function xmlEscape(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colunaExcel(index: number): string {
  let n = index;
  let label = "";
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

export function montarXlsxFechamento(rows: CelulaPlanilha[][]): Buffer {
  const cells = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 1;
      const inner = row
        .map((celula, colIndex) => {
          const ref = `${colunaExcel(colIndex)}${r}`;
          if (typeof celula === "number") {
            return `<c r="${ref}"><v>${celula}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(celula)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r}">${inner}</row>`;
    })
    .join("");

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${cells}</sheetData></worksheet>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Fechamento" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

  return zipStore([
    { name: "[Content_Types].xml", data: Buffer.from(types, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(rels, "utf8") },
    { name: "xl/workbook.xml", data: Buffer.from(workbook, "utf8") },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(workbookRels, "utf8") },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheet, "utf8") },
  ]);
}

function pdfEscape(valor: string): string {
  return [...valor]
    .map((ch) => {
      if (ch === "\\" || ch === "(" || ch === ")") return `\\${ch}`;
      const code = ch.charCodeAt(0);
      if (code >= 32 && code <= 126) return ch;
      if (code <= 255) return `\\${code.toString(8).padStart(3, "0")}`;
      return "?";
    })
    .join("");
}

function textoDasCelulas(rows: CelulaPlanilha[][]): string {
  return rows
    .map((row) => row.map((celula) => String(celula)).join(" "))
    .filter((linha) => linha.trim().length > 0)
    .join("\n");
}

type PdfSecao = {
  lojaNome: string;
  produtos: Array<{ produto: string; unidade: string; quantidade: string }>;
  extras: string[];
};

function parseSecoesPdf(rows: CelulaPlanilha[][]): PdfSecao[] {
  const secoes: PdfSecao[] = [];
  let atual: PdfSecao | null = null;
  let emProdutos = false;

  for (const row of rows) {
    if (row.length === 0) {
      emProdutos = false;
      continue;
    }
    if (row[0] === "Fechamento" && row.length >= 2) {
      atual = { lojaNome: String(row[1]), produtos: [], extras: [] };
      secoes.push(atual);
      emProdutos = false;
      continue;
    }
    if (!atual) continue;

    if (row[0] === "Produto" && row[1] === "Unidade") {
      emProdutos = true;
      continue;
    }
    if (emProdutos && row.length === 3) {
      atual.produtos.push({
        produto: String(row[0]),
        unidade: String(row[1]),
        quantidade: String(row[2]),
      });
      continue;
    }
    emProdutos = false;
    atual.extras.push(row.map((celula) => String(celula)).join(" "));
  }

  return secoes;
}

function subheadSecao(secao: PdfSecao): string {
  const status = new Set<string>();
  for (const linha of secao.extras) {
    if (linha.startsWith("Correção")) status.add("Correção");
    if (linha.startsWith("Fechamento") && linha !== "Envios de hoje") status.add("Fechamento");
  }
  const partes = [secao.lojaNome];
  if (status.size > 0) partes.push([...status].join(", "));
  return partes.join(" · ");
}

const PDF_PAGE_HEIGHT = 792;
const PDF_HEADER_TOP = 742;
const PDF_SUBHEAD_Y = 725;
const PDF_AFTER_SUBHEAD = 20;
const PDF_FOOTER_Y = 30;
const PDF_LINE_HEIGHT = 14;
const PDF_COL_PRODUTO = 50;
const PDF_COL_UNIDADE = 220;
const PDF_COL_QUANTIDADE = 360;
const PDF_CABECALHO_SECAO = PDF_AFTER_SUBHEAD + PDF_LINE_HEIGHT;

function pdfTextoAbsoluto(x: number, y: number, tamanho: number, texto: string): string {
  return `BT\n/F1 ${tamanho} Tf\n1 0 0 1 ${x} ${y} Tm\n(${pdfEscape(texto)}) Tj\nET`;
}

function pdfBarraCabecalho(): string {
  return `0.89 0.11 0.14 rg\n0 ${PDF_HEADER_TOP} 612 50 re f\n0 0 0 rg`;
}

function pdfTituloCabecalho(): string {
  return `1 1 1 rg\n${pdfTextoAbsoluto(50, 755, 18, "Fechamento")}\n0 0 0 rg`;
}

function pdfLinhaProduto(
  y: number,
  produto: string,
  unidade: string,
  quantidade: string,
): string {
  return [
    "BT",
    "/F1 10 Tf",
    `1 0 0 1 ${PDF_COL_PRODUTO} ${y} Tm`,
    `(${pdfEscape(produto)}) Tj`,
    `1 0 0 1 ${PDF_COL_UNIDADE} ${y} Tm`,
    `(${pdfEscape(unidade)}) Tj`,
    `1 0 0 1 ${PDF_COL_QUANTIDADE} ${y} Tm`,
    `(${pdfEscape(quantidade)}) Tj`,
    "ET",
  ].join("\n");
}

function pdfColunasCabecalho(y: number): string {
  return pdfLinhaProduto(y, "Produto", "Unidade", "Quantidade restante");
}

type PdfPaginaEmConstrucao = { ops: string[]; y: number; subhead: string | null };

function pdfPintarCabecalhoSecao(pagina: PdfPaginaEmConstrucao, subhead: string): void {
  pagina.ops.push(pdfTextoAbsoluto(50, pagina.y, 12, subhead));
  pagina.y -= PDF_AFTER_SUBHEAD;
  pagina.ops.push(pdfColunasCabecalho(pagina.y));
  pagina.y -= PDF_LINE_HEIGHT;
}

function pdfNovaPagina(paginas: PdfPaginaEmConstrucao[], subhead: string | null): PdfPaginaEmConstrucao {
  const pagina: PdfPaginaEmConstrucao = {
    ops: [pdfBarraCabecalho(), pdfTituloCabecalho()],
    y: PDF_SUBHEAD_Y,
    subhead,
  };
  if (subhead) pdfPintarCabecalhoSecao(pagina, subhead);
  paginas.push(pagina);
  return pagina;
}

function pdfGarantirEspaco(
  paginas: PdfPaginaEmConstrucao[],
  pagina: PdfPaginaEmConstrucao,
  altura: number,
  subhead: string | null,
): PdfPaginaEmConstrucao {
  if (pagina.y - altura < PDF_FOOTER_Y + PDF_LINE_HEIGHT) {
    return pdfNovaPagina(paginas, subhead);
  }
  return pagina;
}

function montarConteudoPdf(secoes: PdfSecao[]): string[] {
  const paginas: PdfPaginaEmConstrucao[] = [];
  if (secoes.length === 0) {
    pdfNovaPagina(paginas, null);
    return paginas.map((item) => item.ops.join("\n"));
  }

  let pagina: PdfPaginaEmConstrucao | null = null;

  for (const secao of secoes) {
    const subhead = subheadSecao(secao);

    if (!pagina) {
      pagina = pdfNovaPagina(paginas, subhead);
    } else if (pagina.y - PDF_CABECALHO_SECAO < PDF_FOOTER_Y + PDF_LINE_HEIGHT) {
      pagina = pdfNovaPagina(paginas, subhead);
    } else {
      pdfPintarCabecalhoSecao(pagina, subhead);
      pagina.subhead = subhead;
    }

    for (const produto of secao.produtos) {
      pagina = pdfGarantirEspaco(paginas, pagina, PDF_LINE_HEIGHT, subhead);
      pagina.ops.push(
        pdfLinhaProduto(pagina.y, produto.produto, produto.unidade, produto.quantidade),
      );
      pagina.y -= PDF_LINE_HEIGHT;
    }

    for (const linha of secao.extras) {
      pagina = pdfGarantirEspaco(paginas, pagina, PDF_LINE_HEIGHT, subhead);
      pagina.ops.push(pdfTextoAbsoluto(50, pagina.y, 10, linha));
      pagina.y -= PDF_LINE_HEIGHT;
    }

    pagina.y -= PDF_LINE_HEIGHT / 2;
  }

  const total = paginas.length;
  return paginas.map((item, index) => {
    const rodape = pdfTextoAbsoluto(50, PDF_FOOTER_Y, 9, `Página ${index + 1} de ${total}`);
    return [...item.ops, rodape].join("\n");
  });
}

export function montarPdfFechamento(rows: CelulaPlanilha[][]): Buffer {
  const secoes = parseSecoesPdf(rows);
  const pageStreams = montarConteudoPdf(secoes);
  if (pageStreams.length === 0) pageStreams.push(`${pdfBarraCabecalho()}\n${pdfTituloCabecalho()}`);

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const pageIds = pageStreams.map((_, index) => 3 + index * 2);
  objects.push(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageStreams.length} >>`,
  );

  pageStreams.forEach((ops, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${PDF_PAGE_HEIGHT}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${3 + pageStreams.length * 2} 0 R >> >> >>`,
    );
    objects.push(`<< /Length ${Buffer.byteLength(ops, "latin1")} >>\nstream\n${ops}\nendstream`);
  });

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");

  // UTF-8 comment keeps Loja names searchable in the file (e2e) even when WinAnsi encodes accents.
  const comment = textoDasCelulas(rows).replace(/%/g, " ");
  let body = `%PDF-1.4\n% ${comment}\n`;
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const startxref = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  return Buffer.from(body, "utf8");
}
