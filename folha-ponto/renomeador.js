/**
 * SCONT - Renomeador em Lote com Criação de Pastas Dinâmicas e Dicionário de Nomes
 * Arquivo: renomeador.js
 */

const SUPABASE_URL = 'https://udnikmolgryzczalcbbz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmlrbW9sZ3J5emN6YWxjYmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDQzNTUsImV4cCI6MjA5MDcyMDM1NX0.9vCwDkmxhrLAc-UxKpUxiVHF0BBh8OIdGZPKpTWu-lI';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let dirHandleOrigem = null;
let dirHandleDestino = null;
let regrasCadastradas = [];
let empresasCadastradas = {};
let mapeamentosCadastrados = {}; // ✅ Novo: Guarda o dicionário de nomes
let arquivosAnalisados = [];

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = './index.html'; return; }

    document.getElementById('renCompetencia').addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 6);
        e.target.value = v;
    });

    await carregarDadosBase();
});

function mostrarMensagem(titulo, mensagem) {
    document.getElementById('messageTitle').textContent = titulo;
    document.getElementById('messageText').textContent = mensagem;
    document.getElementById('messageModal').classList.add('active');
}
function fecharModalMensagem() { document.getElementById('messageModal').classList.remove('active'); }

// --- CARREGAMENTO DE DADOS ---

async function carregarDadosBase() {
    try {
        // 1. Carregar Regras de Renomeação
        const { data: regras } = await supabaseClient.from('regras_renomeacao').select('*');
        regrasCadastradas = regras || [];

        // 2. Carregar Empresas (para o dicionário de códigos)
        const { data: empresas } = await supabaseClient.from('empresas').select('codigo_empresa, nome_empresa');
        (empresas || []).forEach(emp => {
            empresasCadastradas[emp.codigo_empresa] = emp.nome_empresa;
        });

        // 3. ✅ Carregar Mapeamento de Nomes de Documentos
        const { data: mapeamentos } = await supabaseClient.from('mapeamento_nomes').select('nome_arquivo, nome_documento');
        (mapeamentos || []).forEach(map => {
            mapeamentosCadastrados[map.nome_arquivo] = map.nome_documento;
        });

    } catch (erro) {
        mostrarMensagem('Erro', 'Falha ao carregar regras, empresas e mapeamentos do banco de dados.');
    }
}

// --- FILE SYSTEM ACCESS API ---

async function selecionarPastaOrigem() {
    try {
        dirHandleOrigem = await window.showDirectoryPicker({ mode: 'read' });
        document.getElementById('pathOrigem').textContent = dirHandleOrigem.name;
    } catch (erro) { console.log('Seleção cancelada.'); }
}

async function selecionarPastaDestino() {
    try {
        dirHandleDestino = await window.showDirectoryPicker({ mode: 'readwrite' });
        document.getElementById('pathDestino').textContent = dirHandleDestino.name;
    } catch (erro) { console.log('Seleção cancelada.'); }
}

// --- MOTOR DE REGEX E ANÁLISE ---

function criarRegexDoPadrao(padraoDe) {
    let regexStr = padraoDe.replace(/[.*+?^${}()|[\]\]/g, '\$&');
    regexStr = regexStr.replace(/\{CODIGO_EMPRESA\}/g, '(?<codigo>\d+)');
    regexStr = regexStr.replace(/\{NOME_ARQUIVO\}/g, '(?<nome>.+?)');
    regexStr = regexStr.replace(/\{MM\}/g, '(?<mes>\d{2})');
    regexStr = regexStr.replace(/\{AAAA\}/g, '(?<ano>\d{4})');
    regexStr = regexStr.replace(/\{IGNORAR\}/g, '.*?');
    return new RegExp(`^${regexStr}$`, 'i');
}

async function analisarArquivos() {
    const competencia = document.getElementById('renCompetencia').value;
    if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(competencia)) { mostrarMensagem('Erro', 'Informe uma competência válida (MM/AAAA).'); return; }
    if (!dirHandleOrigem) { mostrarMensagem('Erro', 'Selecione a pasta de origem.'); return; }
    if (!dirHandleDestino) { mostrarMensagem('Erro', 'Selecione a pasta de destino raiz.'); return; }
    if (regrasCadastradas.length === 0) { mostrarMensagem('Erro', 'Nenhuma regra de renomeação cadastrada no sistema.'); return; }

    const [mesComp, anoComp] = competencia.split('/');
    const caminhoDinamicoRaw = document.getElementById('caminhoDinamico').value.trim();
    
    arquivosAnalisados = [];
    let temErros = false;
    let temSucesso = false;

    const tbody = document.getElementById('previewBody');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Analisando arquivos...</td></tr>';
    document.getElementById('step3').style.display = 'block';

    try {
        for await (const entry of dirHandleOrigem.values()) {
            if (entry.kind === 'file') {
                const nomeOriginal = entry.name;
                const lastDotIndex = nomeOriginal.lastIndexOf('.');
                const nomeSemExt = lastDotIndex !== -1 ? nomeOriginal.substring(0, lastDotIndex) : nomeOriginal;
                const extensao = lastDotIndex !== -1 ? nomeOriginal.substring(lastDotIndex) : '';

                let regraAplicada = null;
                let matchResult = null;

                for (const regra of regrasCadastradas) {
                    const regex = criarRegexDoPadrao(regra.padrao_de);
                    const match = nomeSemExt.match(regex);
                    if (match) {
                        regraAplicada = regra;
                        matchResult = match.groups;
                        break;
                    }
                }

                let status = '';
                let classeStatus = '';
                let novoNomeFinal = '';
                let caminhoFinal = '';

                if (!regraAplicada) {
                    status = 'Padrão não reconhecido';
                    classeStatus = 'status-error';
                    temErros = true;
                } else {
                    const codigoExtraido = matchResult.codigo;
                    const nomeArqExtraido = matchResult.nome || '';
                    const nomeEmpresa = empresasCadastradas[codigoExtraido];
                    
                    // ✅ NOVO: Busca o nome mapeado no dicionário. Se não existir, usa o nome original extraído.
                    const nomeDocumentoMapeado = mapeamentosCadastrados[nomeArqExtraido] || nomeArqExtraido;
                    
                    if (!nomeEmpresa) {
                        status = `Empresa ${codigoExtraido} não encontrada`;
                        classeStatus = 'status-warning';
                        temErros = true;
                    } else {
                        // 1. Construir Novo Nome
                        let novoNomeBase = regraAplicada.padrao_para;
                        novoNomeBase = novoNomeBase.replace(/{CODIGO_EMPRESA}/g, codigoExtraido);
                        novoNomeBase = novoNomeBase.replace(/{NOME_EMPRESA}/g, nomeEmpresa);
                        novoNomeBase = novoNomeBase.replace(/{NOME_ARQUIVO}/g, nomeArqExtraido);
                        novoNomeBase = novoNomeBase.replace(/{NOME_DOCUMENTO}/g, nomeDocumentoMapeado); // ✅ Aplica a nova tag
                        novoNomeBase = novoNomeBase.replace(/{MM}/g, mesComp);
                        novoNomeBase = novoNomeBase.replace(/{AAAA}/g, anoComp);
                        novoNomeFinal = novoNomeBase + extensao;

                        // 2. Construir Caminho Dinâmico
                        if (caminhoDinamicoRaw) {
                            caminhoFinal = caminhoDinamicoRaw;
                            caminhoFinal = caminhoFinal.replace(/{CODIGO_EMPRESA}/g, codigoExtraido);
                            caminhoFinal = caminhoFinal.replace(/{NOME_EMPRESA}/g, nomeEmpresa);
                            caminhoFinal = caminhoFinal.replace(/{MM}/g, mesComp);
                            caminhoFinal = caminhoFinal.replace(/{AAAA}/g, anoComp);
                            
                            // Normalizar barras (trocar \ por /) e remover barras nas pontas
                            caminhoFinal = caminhoFinal.replace(/\/g, '/').replace(/^\/+|\/+$/g, '');
                        }

                        status = 'Pronto para processar';
                        classeStatus = 'status-ok';
                        temSucesso = true;
                    }
                }

                arquivosAnalisados.push({
                    fileHandle: entry,
                    nomeOriginal: nomeOriginal,
                    novoNome: novoNomeFinal,
                    caminhoRelativo: caminhoFinal,
                    status: status,
                    classeStatus: classeStatus,
                    podeProcessar: classeStatus === 'status-ok'
                });
            }
        }

        // Renderizar Tabela
        tbody.innerHTML = '';
        if (arquivosAnalisados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Nenhum arquivo encontrado na pasta.</td></tr>';
            return;
        }

        arquivosAnalisados.forEach(arq => {
            // Monta a string de exibição do destino (Pasta/Subpasta/Arquivo.pdf)
            const destinoExibicao = arq.caminhoRelativo ? `${arq.caminhoRelativo}/${arq.novoNome}` : arq.novoNome;
            
            tbody.innerHTML += `
                <tr>
                    <td>${arq.nomeOriginal}</td>
                    <td style="color: ${arq.podeProcessar ? '#8B3A3A' : '#999'}; font-weight: ${arq.podeProcessar ? 'bold' : 'normal'};">${destinoExibicao || '-'}</td>
                    <td><span class="status-badge ${arq.classeStatus}">${arq.status}</span></td>
                </tr>
            `;
        });

        document.getElementById('avisoErros').style.display = temErros ? 'block' : 'none';
        document.getElementById('btnExecutar').style.display = temSucesso ? 'block' : 'none';

    } catch (erro) {
        console.error(erro);
        mostrarMensagem('Erro', 'Falha ao ler a pasta de origem. Verifique as permissões do navegador.');
    }
}

// --- EXECUÇÃO (CRIAR PASTAS E COPIAR ARQUIVOS) ---

async function executarRenomeacao() {
    const arquivosParaProcessar = arquivosAnalisados.filter(a => a.podeProcessar);
    if (arquivosParaProcessar.length === 0) return;

    mostrarMensagem('Processando', 'Criando pastas e copiando arquivos. Por favor, aguarde...');
    
    let sucessoCount = 0;
    let erroCount = 0;

    try {
        for (const arq of arquivosParaProcessar) {
            try {
                // 1. Ler o arquivo original
                const file = await arq.fileHandle.getFile();
                
                // 2. Navegar e Criar Diretórios Dinâmicos
                let currentDirHandle = dirHandleDestino; // Começa na raiz selecionada
                
                if (arq.caminhoRelativo) {
                    const pathParts = arq.caminhoRelativo.split('/');
                    for (const part of pathParts) {
                        if (part.trim() !== '') {
                            // getDirectoryHandle com create: true cria a pasta se não existir
                            currentDirHandle = await currentDirHandle.getDirectoryHandle(part, { create: true });
                        }
                    }
                }
                
                // 3. Criar o novo arquivo na pasta de destino final
                const newFileHandle = await currentDirHandle.getFileHandle(arq.novoNome, { create: true });
                
                // 4. Escrever os dados no novo arquivo
                const writable = await newFileHandle.createWritable();
                await writable.write(file);
                await writable.close();
                
                sucessoCount++;
            } catch (e) {
                console.error(`Erro ao processar ${arq.nomeOriginal}:`, e);
                erroCount++;
            }
        }

        mostrarMensagem('Concluído', `Processamento finalizado!\n\n✅ Sucesso: ${sucessoCount} arquivos copiados\n❌ Erros: ${erroCount} arquivos\n\nOs arquivos originais foram mantidos na pasta de origem.`);
        
        document.getElementById('step3').style.display = 'none';
        
    } catch (erro) {
        mostrarMensagem('Erro', 'Falha crítica ao gravar na pasta de destino. Verifique as permissões.');
    }
}