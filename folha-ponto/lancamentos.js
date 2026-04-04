/**
 * SCONT - Lançamentos em Lote
 * Arquivo: lancamentos.js (Acesso Livre - Leitura do Supabase)
 */

const SUPABASE_URL = 'https://udnikmolgryzczalcbbz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmlrbW9sZ3J5emN6YWxjYmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDQzNTUsImV4cCI6MjA5MDcyMDM1NX0.9vCwDkmxhrLAc-UxKpUxiVHF0BBh8OIdGZPKpTWu-lI';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let conteudoTXTGerado = '';

document.addEventListener('DOMContentLoaded', async () => {
    // ✅ ACESSO LIVRE: Nenhuma verificação de usuário (auth.getUser) é feita aqui.

    // Formatação do campo de competência
    document.getElementById('lanCompetencia').addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 6);
        e.target.value = v;
    });

    // Carrega a lista de empresas cadastradas pelo Admin logo ao iniciar
    carregarEmpresas();
});

// --- FUNÇÕES DE INTERFACE E UTILITÁRIOS ---

function mostrarMensagem(titulo, mensagem) {
    document.getElementById('messageTitle').textContent = titulo;
    document.getElementById('messageText').textContent = mensagem;
    document.getElementById('messageModal').classList.add('active');
}

function fecharModalMensagem() {
    document.getElementById('messageModal').classList.remove('active');
}

function ativarStep(stepId) {
    document.querySelectorAll('.step-card').forEach(card => card.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}

function filtrarLista(inputId, listId) {
    const termo = document.getElementById(inputId).value.toLowerCase();
    const itens = document.querySelectorAll(`#${listId} .checkbox-item`);
    
    itens.forEach(item => {
        const texto = item.textContent.toLowerCase();
        item.style.display = texto.includes(termo) ? 'flex' : 'none';
    });
}

function selecionarTodos(containerId, selecionar) {
    const itensVisiveis = Array.from(document.querySelectorAll(`#${containerId} .checkbox-item`))
                               .filter(item => item.style.display !== 'none');
    
    itensVisiveis.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = selecionar;
    });
}

// --- LÓGICA DE DADOS (BUSCA NO SUPABASE) ---

async function carregarEmpresas() {
    const container = document.getElementById('listaEmpresas');
    container.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">Carregando empresas do banco de dados...</div>';

    try {
        // Busca as empresas cadastradas pelo Administrador
        const { data, error } = await supabaseClient
            .from('empresas')
            .select('codigo_empresa, nome_empresa')
            .order('nome_empresa', { ascending: true });

        if (error) throw error;

        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">Nenhuma empresa cadastrada no sistema.</div>';
            return;
        }

        data.forEach(emp => {
            container.innerHTML += `
                <div class="checkbox-item">
                    <input type="checkbox" id="emp_${emp.codigo_empresa}" value="${emp.codigo_empresa}">
                    <label for="emp_${emp.codigo_empresa}">${emp.codigo_empresa} - ${emp.nome_empresa}</label>
                </div>
            `;
        });

    } catch (erro) {
        console.error('Erro ao carregar empresas:', erro);
        mostrarMensagem('Erro', 'Falha ao carregar a lista de empresas do servidor.');
    }
}

async function buscarEmpregados() {
    const comp = document.getElementById('lanCompetencia').value;
    if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(comp)) {
        mostrarMensagem('Atenção', 'Informe uma competência válida (MM/AAAA).');
        return;
    }

    const checkboxesEmpresas = document.querySelectorAll('#listaEmpresas input[type="checkbox"]:checked');
    const empresasSelecionadas = Array.from(checkboxesEmpresas).map(cb => cb.value);

    if (empresasSelecionadas.length === 0) {
        mostrarMensagem('Atenção', 'Selecione pelo menos uma empresa.');
        return;
    }

    const container = document.getElementById('listaEmpregados');
    container.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">Buscando empregados vinculados...</div>';
    ativarStep('step2');

    try {
        // Busca os empregados vinculados às empresas selecionadas
        const { data, error } = await supabaseClient
            .from('empregados')
            .select('codigo_empresa, codigo_empregado, nome_empregado')
            .in('codigo_empresa', empresasSelecionadas)
            .order('codigo_empresa', { ascending: true })
            .order('nome_empregado', { ascending: true });

        if (error) throw error;

        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">Nenhum empregado encontrado para as empresas selecionadas.</div>';
            return;
        }

        data.forEach(emp => {
            const valorCheckbox = `${emp.codigo_empresa}|${emp.codigo_empregado}`;
            container.innerHTML += `
                <div class="checkbox-item">
                    <input type="checkbox" id="empr_${emp.codigo_empregado}_${emp.codigo_empresa}" value="${valorCheckbox}" checked>
                    <label for="empr_${emp.codigo_empregado}_${emp.codigo_empresa}">
                        <span style="color: #8B3A3A; font-weight: bold; margin-right: 5px;">[Emp: ${emp.codigo_empresa}]</span> 
                        ${emp.codigo_empregado} - ${emp.nome_empregado}
                    </label>
                </div>
            `;
        });

    } catch (erro) {
        console.error('Erro ao buscar empregados:', erro);
        mostrarMensagem('Erro', 'Falha ao buscar a lista de empregados.');
    }
}

function avancarParaParametros() {
    const checkboxesEmpregados = document.querySelectorAll('#listaEmpregados input[type="checkbox"]:checked');
    if (checkboxesEmpregados.length === 0) {
        mostrarMensagem('Atenção', 'Selecione pelo menos um empregado para continuar.');
        return;
    }
    ativarStep('step3');
}

// --- GERAÇÃO DO TXT ---

function gerarPrevia() {
    const comp = document.getElementById('lanCompetencia').value;
    const tipoProcesso = document.getElementById('lanTipoProcesso').value;
    const rubrica = document.getElementById('lanRubrica').value.trim();
    const valor = document.getElementById('lanValor').value.trim();

    if (!tipoProcesso) { mostrarMensagem('Atenção', 'Selecione o Tipo do Processo.'); return; }
    if (!rubrica || !/^\d+$/.test(rubrica)) { mostrarMensagem('Atenção', 'Informe um Código de Rubrica válido (apenas números).'); return; }
    if (!valor || !/^\d+$/.test(valor)) { mostrarMensagem('Atenção', 'Informe um Valor válido (apenas números inteiros).'); return; }

    const checkboxesEmpregados = document.querySelectorAll('#listaEmpregados input[type="checkbox"]:checked');
    const empregadosSelecionados = Array.from(checkboxesEmpregados).map(cb => cb.value);

    if (empregadosSelecionados.length === 0) {
        mostrarMensagem('Atenção', 'Nenhum empregado selecionado. Volte ao passo 2.');
        return;
    }

    const fixo = "10";
    const compParts = comp.split('/');
    const compFormatada = compParts[1] + compParts[0]; // AAAA + MM
    const tipoProcFormatado = String(tipoProcesso).padStart(2, '0');
    const rubFormatada = String(rubrica).padStart(9, '0');
    const valFormatado = String(valor).padStart(9, '0');

    conteudoTXTGerado = '';

    empregadosSelecionados.forEach(empData => {
        const [codEmpresa, codEmpregado] = empData.split('|');
        
        const codEmpregadoFormatado = String(codEmpregado).padStart(10, '0');
        const codEmpresaFormatada = String(codEmpresa).padStart(10, '0');

        conteudoTXTGerado += `${fixo}${codEmpregadoFormatado}${compFormatada}${rubFormatada}${tipoProcFormatado}${valFormatado}${codEmpresaFormatada}\n`;
    });

    document.getElementById('previaTxt').textContent = conteudoTXTGerado;
    ativarStep('step4');
}

function voltarParaEdicao() {
    ativarStep('step3');
}

function baixarTXT() {
    if (!conteudoTXTGerado) {
        mostrarMensagem('Erro', 'Nenhum conteúdo gerado para exportar.');
        return;
    }

    const comp = document.getElementById('lanCompetencia').value.replace('/', '-');
    const rubrica = document.getElementById('lanRubrica').value.trim();
    
    const blob = new Blob([conteudoTXTGerado], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lancamento_Lote_Rubrica${rubrica}_${comp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    mostrarMensagem('Sucesso', 'Arquivo TXT baixado com sucesso!');
}