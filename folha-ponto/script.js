/**
 * SCONT - Sistema de Gestão de Ponto e Folha de Pagamento
 * Arquivo: script.js (VERSÃO FINAL v10.0 - Com Exportação TXT)
 * Parte 1: Inicialização e Autenticação
 */

// --- AGUARDAR BIBLIOTECAS ---
console.log('⏳ Aguardando bibliotecas carregarem...');
let tentativas = 0;
const aguardarBibliotecas = setInterval(() => {
    tentativas++;
    if (typeof supabase !== 'undefined' && typeof XLSX !== 'undefined') {
        console.log('✅ Todas as bibliotecas carregadas com sucesso');
        clearInterval(aguardarBibliotecas);
        inicializarSistema();
    } else if (tentativas > 100) {
        console.error('❌ Timeout ao carregar bibliotecas');
        clearInterval(aguardarBibliotecas);
        alert('Erro ao carregar o sistema. Recarregue a página.');
    }
}, 50);

// --- INICIALIZAR SISTEMA ---
async function inicializarSistema() {
    console.log('🚀 Inicializando sistema...');
    
    const SUPABASE_URL = 'https://udnikmolgryzczalcbbz.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmlrbW9sZ3J5emN6YWxjYmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDQzNTUsImV4cCI6MjA5MDcyMDM1NX0.9vCwDkmxhrLAc-UxKpUxiVHF0BBh8OIdGZPKpTWu-lI';
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    window.state = {
        usuarioAutenticado: null, usuarioEmail: null, usuarioId: null,
        competencia: '', codigoEmpresa: '', jornada: '08:00', feriados: [],
        ruleExtra100Optional: false, folhas: [], abaSelecionada: 0, resultados: null
    };

    window.persistenceState = { isLoading: false, lastSaveTime: null, saveInProgress: false, autoSaveInterval: null };
    window.empregadosDisponiveis = [];

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            state.usuarioAutenticado = true; state.usuarioId = user.id; state.usuarioEmail = user.email;
            inicializarComSupabase(); inicializarEventos(); atualizarHeaderAcoes(); mostrarTela('selectionScreen');
        } else {
            inicializarEventos(); mostrarTela('loginScreen');
        }
    } catch (erro) {
        inicializarEventos(); mostrarTela('loginScreen');
    }
    
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            state.usuarioAutenticado = true; state.usuarioId = session.user.id; state.usuarioEmail = session.user.email;
            inicializarComSupabase(); atualizarHeaderAcoes(); mostrarTela('selectionScreen');
        } else if (event === 'SIGNED_OUT') {
            state.usuarioAutenticado = false; state.usuarioId = null; state.usuarioEmail = null;
            pararAutoSave(); document.getElementById('headerActions').innerHTML = ''; mostrarTela('loginScreen');
        }
    });
}

// --- AUTENTICAÇÃO ---
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) { mostrarMensagem('Erro', 'Preencha email e senha.'); return; }
    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) { mostrarMensagem('Erro', error.message); return; }
        document.getElementById('loginForm').reset();
    } catch (erro) { mostrarMensagem('Erro', 'Erro ao fazer login.'); }
}

async function handleRegistro(e) {
    e.preventDefault();
    const nome = document.getElementById('registroNome').value.trim();
    const email = document.getElementById('registroEmail').value.trim();
    const password = document.getElementById('registroPassword').value;
    const passwordConfirm = document.getElementById('registroPasswordConfirm').value;
    if (!nome || !email || !password || !passwordConfirm) { mostrarMensagem('Erro', 'Preencha todos os campos.'); return; }
    if (password !== passwordConfirm) { mostrarMensagem('Erro', 'As senhas não conferem.'); return; }
    if (password.length < 6) { mostrarMensagem('Erro', 'Senha deve ter no mínimo 6 caracteres.'); return; }
    try {
        const { error } = await supabaseClient.auth.signUp({ email, password, options: { data: { nome } } });
        if (error) { mostrarMensagem('Erro', error.message); return; }
        mostrarMensagem('Sucesso', 'Conta criada! Você pode fazer login agora.');
        document.getElementById('registroForm').reset();
        setTimeout(() => { mostrarTelaLogin(); }, 2000);
    } catch (erro) { mostrarMensagem('Erro', 'Erro ao criar conta.'); }
}

async function fazerLogout(e) {
    if (e) e.preventDefault();
    mostrarConfirmacao('Sair', 'Deseja sair do sistema?', async () => {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) { mostrarMensagem('Erro', 'Erro ao fazer logout: ' + error.message); return; }
            state.usuarioAutenticado = false; state.usuarioId = null; state.usuarioEmail = null;
            state.folhas = []; state.abaSelecionada = 0; state.competencia = ''; state.codigoEmpresa = '';
            pararAutoSave(); document.getElementById('headerActions').innerHTML = '';
            document.getElementById('selectionForm').reset(); document.getElementById('loginForm').reset();
            mostrarTela('loginScreen');
        } catch (erro) { mostrarMensagem('Erro', 'Erro ao fazer logout.'); }
    });
}

function mostrarTelaLogin(e) { if (e) e.preventDefault(); mostrarTela('loginScreen'); }
function mostrarTelaRegistro(e) { if (e) e.preventDefault(); mostrarTela('registroScreen'); }

function atualizarHeaderAcoes() {
    const headerActions = document.getElementById('headerActions');
    if (!headerActions) return;
    if (state.usuarioAutenticado && state.usuarioEmail) {
        headerActions.innerHTML = `<span style="color: white; font-size: 13px; margin-right: 15px;">👤 ${state.usuarioEmail}</span><button type="button" class="btn btn-small" onclick="fazerLogout()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">🚪 Sair</button>`;
    } else { headerActions.innerHTML = ''; }
}

// --- PERSISTÊNCIA E CARREGAMENTO INICIAL ---
async function inicializarComSupabase() {
    try {
        carregarEmpresasDropbox();
        const codigoEmpresaSelect = document.getElementById('codigoEmpresa');
        if (codigoEmpresaSelect) {
            codigoEmpresaSelect.addEventListener('change', (e) => { carregarEmpregadosDropbox(e.target.value); });
        }
        iniciarAutoSave();
    } catch (erro) { console.error('❌ Erro ao inicializar Supabase:', erro); }
}

async function carregarEmpresasDropbox() {
    try {
        const { data, error } = await supabaseClient.from('empresas').select('codigo_empresa, nome_empresa').order('nome_empresa', { ascending: true });
        if (error) throw error;
        const select = document.getElementById('codigoEmpresa');
        if (!select) return;
        select.innerHTML = '<option value="">Selecione uma empresa...</option>';
        (data || []).forEach(empresa => {
            const option = document.createElement('option'); option.value = empresa.codigo_empresa; option.textContent = `${empresa.codigo_empresa} - ${empresa.nome_empresa}`; select.appendChild(option);
        });
    } catch (erro) { console.error('❌ Erro ao carregar empresas:', erro); }
}

async function carregarEmpregadosDropbox(codigoEmpresa) {
    try {
        if (!codigoEmpresa) {
            const select = document.getElementById('nomeTrabalhador');
            if (select) select.innerHTML = '<option value="">Selecione uma empresa primeiro</option>';
            return;
        }
        const { data, error } = await supabaseClient.from('empregados').select('codigo_empregado, nome_empregado').eq('codigo_empresa', codigoEmpresa).order('nome_empregado', { ascending: true });
        if (error) throw error;
        const select = document.getElementById('nomeTrabalhador');
        if (!select) return;
        select.innerHTML = '<option value="">Selecione um empregado...</option>';
        (data || []).forEach(empregado => {
            const option = document.createElement('option'); option.value = empregado.nome_empregado; option.textContent = `${empregado.codigo_empregado} - ${empregado.nome_empregado}`; select.appendChild(option);
        });
    } catch (erro) { console.error('❌ Erro ao carregar empregados:', erro); }
}

async function carregarEmpregadosDisponiveisParaTela() {
    try {
        if (!state.codigoEmpresa) { window.empregadosDisponiveis = []; return; }
        const { data, error } = await supabaseClient.from('empregados').select('codigo_empregado, nome_empregado').eq('codigo_empresa', state.codigoEmpresa).order('nome_empregado', { ascending: true });
        if (error) throw error;
        window.empregadosDisponiveis = (data || []).map(emp => ({ codigo: emp.codigo_empregado, nome: emp.nome_empregado }));
    } catch (erro) { window.empregadosDisponiveis = []; }
}

async function salvarFolhaNoSupabase() {
    if (persistenceState.saveInProgress || !state.usuarioAutenticado || !state.competencia || !state.codigoEmpresa || state.folhas.length === 0) return;
    persistenceState.saveInProgress = true;
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const nomeUsuario = user?.user_metadata?.nome || user?.email || 'Sistema';
        for (const folha of state.folhas) {
            if (!folha.nomeTrabalhador) continue;
            const saveRecord = {
                usuario_id: state.usuarioId, empresa_codigo: state.codigoEmpresa, competencia: state.competencia,
                nome_trabalhador: folha.nomeTrabalhador, folha_id: folha.id.toString(), dados_json: JSON.stringify(folha.dados),
                feriados_json: JSON.stringify(state.feriados), jornada: state.jornada, rule_extra_100_opcional: state.ruleExtra100Optional,
                data_atualizacao: new Date().toISOString(), status: 'em_preenchimento', criado_por: state.usuarioId, atualizado_por: state.usuarioId, nome_usuario: nomeUsuario
            };
            const { data: existente } = await supabaseClient.from('saves').select('id').eq('usuario_id', state.usuarioId).eq('empresa_codigo', state.codigoEmpresa).eq('competencia', state.competencia).eq('folha_id', folha.id.toString()).single();
            if (existente) { await supabaseClient.from('saves').update(saveRecord).eq('id', existente.id); } 
            else { await supabaseClient.from('saves').insert([saveRecord]); }
        }
        persistenceState.lastSaveTime = new Date();
    } catch (erro) { console.error('❌ Erro ao salvar:', erro); } finally { persistenceState.saveInProgress = false; }
}

function iniciarAutoSave() {
    if (persistenceState.autoSaveInterval) clearInterval(persistenceState.autoSaveInterval);
    persistenceState.autoSaveInterval = setInterval(() => { salvarFolhaNoSupabase(); }, 30000);
}
function pararAutoSave() {
    if (persistenceState.autoSaveInterval) { clearInterval(persistenceState.autoSaveInterval); persistenceState.autoSaveInterval = null; }
}

// --- CARREGAMENTO DE PREENCHIMENTOS ANTERIORES ---
async function carregarPreenchimentosAnteriores() {
    try {
        const competencia = document.getElementById('competencia').value.trim();
        const codigoEmpresa = document.getElementById('codigoEmpresa').value.trim();
        if (!validarCompetencia(competencia) || !codigoEmpresa) { mostrarMensagem('Erro', 'Preencha competência e código da empresa.'); return; }
        
        const { data: registros, error } = await supabaseClient.from('saves').select('*').eq('empresa_codigo', codigoEmpresa).eq('competencia', competencia).eq('status', 'em_preenchimento').order('data_atualizacao', { ascending: false });
        if (error) throw error;
        
        if (!registros || registros.length === 0) { iniciarNovoPreenchimento(competencia, codigoEmpresa); return; }
        
        const ultimasVersoes = filtrarUltimasVersoes(registros);
        if (ultimasVersoes.length === 0) { iniciarNovoPreenchimento(competencia, codigoEmpresa); return; }
        
        const agrupado = agruparPreenchimentos(ultimasVersoes);
        mostrarModalPreenchimentosAnterioresAgrupado(agrupado, competencia, codigoEmpresa, ultimasVersoes);
    } catch (erro) { mostrarMensagem('Erro', 'Erro ao carregar preenchimentos anteriores.'); }
}

function filtrarUltimasVersoes(registros) {
    const mapa = {};
    const ordenados = registros.sort((a, b) => new Date(b.data_atualizacao) - new Date(a.data_atualizacao));
    ordenados.forEach(registro => {
        const chaveEmpregado = `${registro.nome_trabalhador}`;
        if (!mapa[chaveEmpregado]) { mapa[chaveEmpregado] = registro; }
    });
    return Object.values(mapa);
}

function agruparPreenchimentos(registros) {
    const agrupado = {};
    registros.forEach(registro => {
        const dataFormatada = new Date(registro.data_atualizacao).toLocaleString('pt-BR');
        const nomeAutor = registro.nome_usuario || registro.atualizado_por || 'Sistema';
        const chave = `${nomeAutor}_${dataFormatada}`;
        if (!agrupado[chave]) { agrupado[chave] = { usuarioId: registro.atualizado_por, nomeUsuario: nomeAutor, dataAtualizacao: registro.data_atualizacao, dataFormatada: dataFormatada, empregados: [] }; }
        agrupado[chave].empregados.push(registro);
    });
    return Object.values(agrupado);
}

function mostrarModalPreenchimentosAnterioresAgrupado(agrupados, competencia, codigoEmpresa, todosRegistros) {
    const modal = document.createElement('div'); modal.id = 'preenchimentosAnterioresModal'; modal.className = 'modal active';
    const totalFolhas = todosRegistros.length;
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header"><h3>📋 Preenchimentos Anteriores</h3><button type="button" class="modal-close" onclick="fecharModalPreenchimentos()">×</button></div>
            <div class="modal-body">
                <p>Preenchimentos encontrados para <strong>${codigoEmpresa}</strong> - <strong>${competencia}</strong>:</p>
                <p style="font-size: 12px; color: #666; margin-bottom: 15px;">ℹ️ Mostrando apenas a última versão de cada empregado</p>
                <div id="preenchimentosList" class="registros-list"></div>
                <div class="modal-buttons-container">
                    <button type="button" class="btn btn-primary btn-full" onclick="carregarTodosPreenchimentos('${codigoEmpresa}', '${competencia}')">▶️ Carregar Preenchimento</button>
                    <button type="button" class="btn btn-secondary btn-full" onclick="iniciarNovoPreenchimento('${competencia}', '${codigoEmpresa}')">➕ Novo Preenchimento</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    const lista = document.getElementById('preenchimentosList');
    agrupados.forEach((grupo) => {
        const item = document.createElement('div'); item.className = 'registro-item';
        const empregadosLista = grupo.empregados.map(e => e.nome_trabalhador).join(', ');
        item.innerHTML = `<div class="registro-info"><h4>📁 Folhas: ${empregadosLista}</h4><p>👤 Autor da Última Modificação: <strong>${grupo.nomeUsuario}</strong></p><p>📅 Data: ${grupo.dataFormatada}</p><p>📊 Total de folhas: ${grupo.empregados.length}</p></div>`;
        lista.appendChild(item);
    });
}

function fecharModalPreenchimentos() {
    const modal = document.getElementById('preenchimentosAnterioresModal');
    if (modal) { modal.classList.remove('active'); setTimeout(() => modal.remove(), 300); }
}

async function carregarTodosPreenchimentos(codigoEmpresa, competencia) {
    try {
        const { data: registros, error } = await supabaseClient.from('saves').select('*').eq('empresa_codigo', codigoEmpresa).eq('competencia', competencia).eq('status', 'em_preenchimento').order('data_atualizacao', { ascending: false });
        if (error) throw error;
        if (!registros || registros.length === 0) { mostrarMensagem('Erro', 'Nenhuma folha encontrada para carregar.'); return; }
        
        const ultimasVersoes = filtrarUltimasVersoes(registros);
        state.folhas = [];
        ultimasVersoes.forEach((registro) => {
            try {
                state.folhas.push({ id: parseInt(registro.folha_id), nomeTrabalhador: registro.nome_trabalhador, dados: JSON.parse(registro.dados_json), autorUltimaMod: registro.nome_usuario || registro.atualizado_por || 'Sistema' });
            } catch (erro) {}
        });
        
        const primeiroRegistro = ultimasVersoes[0];
        state.competencia = primeiroRegistro.competencia; state.codigoEmpresa = primeiroRegistro.empresa_codigo;
        state.jornada = primeiroRegistro.jornada || '08:00'; state.ruleExtra100Optional = primeiroRegistro.rule_extra_100_opcional || false;
        state.feriados = JSON.parse(primeiroRegistro.feriados_json || '[]');
        
        await carregarEmpregadosDisponiveisParaTela();
        
        const jornadaInput = document.getElementById('jornada'); if (jornadaInput) jornadaInput.value = state.jornada;
        const ruleCheckbox = document.getElementById('ruleExtra100Optional'); if (ruleCheckbox) ruleCheckbox.checked = state.ruleExtra100Optional;
        
        state.abaSelecionada = 0; fecharModalPreenchimentos(); mostrarTela('mainScreen');
        renderizarAbas(); renderizarConteudoAba(); renderizarTabelaFeriados(); iniciarAutoSave();
    } catch (erro) { mostrarMensagem('Erro', 'Erro ao carregar preenchimentos.'); }
}

function iniciarNovoPreenchimento(competencia, codigoEmpresa) {
    state.competencia = competencia; state.codigoEmpresa = codigoEmpresa; state.folhas = []; state.abaSelecionada = 0;
    carregarFeriadosPadrao(); carregarEmpregadosDisponiveisParaTela();
    fecharModalPreenchimentos(); mostrarTela('mainScreen'); adicionarNovaFolha(); iniciarAutoSave();
}

/**
 * Parte 2: Eventos, Abas e Renderização de Conteúdo
 */

// --- INICIALIZAÇÃO DE EVENTOS ---
function inicializarEventos() {
    const loginForm = document.getElementById('loginForm'); if (loginForm) loginForm.addEventListener('submit', handleLogin);
    const registroForm = document.getElementById('registroForm'); if (registroForm) registroForm.addEventListener('submit', handleRegistro);
    const selectionForm = document.getElementById('selectionForm'); if (selectionForm) selectionForm.addEventListener('submit', handleCarregarFolhaComPersistencia);
    const addTabBtn = document.getElementById('addTabBtn'); if (addTabBtn) addTabBtn.addEventListener('click', adicionarNovaFolha);
    const openFeriadosBtn = document.getElementById('openFeriadosBtn'); if (openFeriadosBtn) openFeriadosBtn.addEventListener('click', abrirModalFeriados);
    const addFeriadoBtn = document.getElementById('addFeriadoBtn'); if (addFeriadoBtn) addFeriadoBtn.addEventListener('click', adicionarFeriado);
    const closeFeriadosBtn = document.getElementById('closeFeriadosBtn'); if (closeFeriadosBtn) closeFeriadosBtn.addEventListener('click', fecharModalFeriados);
    const processBtn = document.getElementById('processBtn'); if (processBtn) processBtn.addEventListener('click', processarFolhaComSalvamento);
    const resetBtn = document.getElementById('resetBtn'); if (resetBtn) resetBtn.addEventListener('click', resetarDadosComSupabase);
    const exportXlsxBtn = document.getElementById('exportXlsxBtn'); if (exportXlsxBtn) exportXlsxBtn.addEventListener('click', exportarParaExcel);
    const backToEditBtn = document.getElementById('backToEditBtn'); if (backToEditBtn) backToEditBtn.addEventListener('click', voltarParaEdicao);
    
    const competencia = document.getElementById('competencia'); if (competencia) competencia.addEventListener('input', (e) => { e.target.value = formatarCompetencia(e.target.value); });
    const jornada = document.getElementById('jornada'); if (jornada) jornada.addEventListener('input', (e) => { e.target.value = formatarHora(e.target.value); });
    const novaDataFeriado = document.getElementById('novaDataFeriado'); if (novaDataFeriado) novaDataFeriado.addEventListener('input', (e) => { e.target.value = formatarData(e.target.value); });
    const ruleExtra100Optional = document.getElementById('ruleExtra100Optional'); if (ruleExtra100Optional) ruleExtra100Optional.addEventListener('change', (e) => { state.ruleExtra100Optional = e.target.checked; });
}

async function handleCarregarFolhaComPersistencia(e) {
    e.preventDefault();
    const competencia = document.getElementById('competencia').value.trim();
    const codigoEmpresa = document.getElementById('codigoEmpresa').value.trim();
    if (!validarCompetencia(competencia)) { mostrarMensagem('Erro', 'Competência inválida. Use o formato MM/AAAA (ex: 02/2026).'); return; }
    if (!codigoEmpresa) { mostrarMensagem('Erro', 'Código da empresa é obrigatório.'); return; }
    state.codigoEmpresa = codigoEmpresa;
    await carregarEmpregadosDisponiveisParaTela();
    await carregarPreenchimentosAnteriores();
}

function validarCompetencia(competencia) { return /^(0[1-9]|1[0-2])\/\d{4}$/.test(competencia); }

// --- SISTEMA DE ABAS ---
function adicionarNovaFolha() {
    const empregadosJaSelecionados = state.folhas.map(f => f.nomeTrabalhador).filter(n => n);
    const empregadosDisponiveis = window.empregadosDisponiveis || [];
    const empregadosNaoSelecionados = empregadosDisponiveis.filter(emp => !empregadosJaSelecionados.includes(emp.nome));
    
    if (empregadosNaoSelecionados.length === 0 && empregadosDisponiveis.length > 0) {
        mostrarMensagem('Aviso', 'Todos os empregados já foram selecionados para esta empresa.'); return;
    }
    
    const novaFolha = { id: Date.now(), nomeTrabalhador: '', dados: {} };
    const [mes, ano] = state.competencia.split('/');
    const diasNoMes = new Date(ano, mes, 0).getDate();
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = String(dia).padStart(2, '0') + '/' + mes + '/' + ano;
        novaFolha.dados[data] = { entrada1: '', saida1: '', entrada2: '', saida2: '' };
    }
    state.folhas.push(novaFolha); state.abaSelecionada = state.folhas.length - 1;
    renderizarAbas(); renderizarConteudoAba();
}

function renderizarAbas() {
    const tabsNav = document.getElementById('tabsNav'); tabsNav.innerHTML = '';
    state.folhas.forEach((folha, index) => {
        const tab = document.createElement('button'); tab.type = 'button'; tab.className = 'tab-button' + (index === state.abaSelecionada ? ' active' : '');
        tab.innerHTML = `<span>${folha.nomeTrabalhador || 'Folha ' + (index + 1)}</span><button type="button" class="tab-close" onclick="event.stopPropagation(); removerFolha(${index})">×</button>`;
        tab.addEventListener('click', () => { state.abaSelecionada = index; renderizarAbas(); renderizarConteudoAba(); });
        tabsNav.appendChild(tab);
    });
}

function removerFolha(index) {
    mostrarConfirmacao('Remover Folha', 'Deseja remover esta folha de ponto?', () => {
        state.folhas.splice(index, 1);
        if (state.abaSelecionada >= state.folhas.length) state.abaSelecionada = Math.max(0, state.folhas.length - 1);
        renderizarAbas(); if(state.folhas.length > 0) renderizarConteudoAba(); else document.getElementById('tabsContent').innerHTML = '';
    });
}

// --- RENDERIZAÇÃO DE CONTEÚDO DA ABA ---
function renderizarConteudoAba() {
    const tabsContent = document.getElementById('tabsContent'); tabsContent.innerHTML = '';
    if (state.folhas.length === 0) return;
    
    const folha = state.folhas[state.abaSelecionada];
    const [mes, ano] = state.competencia.split('/');
    const diasNoMes = new Date(ano, mes, 0).getDate();
    
    const header = document.createElement('div'); header.className = 'tab-content-header';
    
    const empregadosJaSelecionados = state.folhas.map((f, idx) => idx !== state.abaSelecionada ? f.nomeTrabalhador : null).filter(n => n);
    const empregadosDisponiveis = window.empregadosDisponiveis || [];
    const empregadosParaSelect = empregadosDisponiveis.filter(emp => !empregadosJaSelecionados.includes(emp.nome));
    
    let optionsHTML = '<option value="">Selecione um empregado...</option>';
    empregadosParaSelect.forEach(emp => {
        const selected = emp.nome === folha.nomeTrabalhador ? 'selected' : '';
        optionsHTML += `<option value="${emp.nome}" ${selected}>${emp.codigo} - ${emp.nome}</option>`;
    });
    
    if (folha.nomeTrabalhador && !empregadosParaSelect.find(e => e.nome === folha.nomeTrabalhador)) {
        const empSelecionado = empregadosDisponiveis.find(e => e.nome === folha.nomeTrabalhador);
        if (empSelecionado) { optionsHTML = `<option value="${empSelecionado.nome}" selected>${empSelecionado.codigo} - ${empSelecionado.nome}</option>` + optionsHTML; }
    }
    
    header.innerHTML = `<div class="form-group"><label for="nomeTrabalhador">Nome do Empregado *</label><select id="nomeTrabalhador" required>${optionsHTML}</select><small>Selecione o empregado</small></div>`;
    
    const selectNome = header.querySelector('#nomeTrabalhador');
    selectNome.addEventListener('change', (e) => { folha.nomeTrabalhador = e.target.value; renderizarAbas(); });
    tabsContent.appendChild(header);
    
    const tableWrapper = document.createElement('div'); tableWrapper.className = 'table-wrapper';
    const table = document.createElement('table'); const thead = document.createElement('thead'); const tbody = document.createElement('tbody');
    const headerRow = document.createElement('tr'); headerRow.innerHTML = '<th>DATA</th><th>DIA DA SEMANA</th><th>ENTRADA 1</th><th>SAIDA 1</th><th>ENTRADA 2</th><th>SAIDA 2</th>'; thead.appendChild(headerRow);
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = String(dia).padStart(2, '0') + '/' + mes + '/' + ano;
        const dataObj = new Date(ano, mes - 1, dia);
        const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][dataObj.getDay()];
        const dados = folha.dados[data];
        const row = document.createElement('tr');
        const isFeriado = state.feriados.some(f => f.data === data);
        const isDSR = dataObj.getDay() === 0;
        if (isFeriado || isDSR) row.classList.add(isFeriado ? 'feriado' : 'dsr');
        
        row.innerHTML = `<td>${data}</td><td>${diaSemana}</td><td><input type="text" class="time-input entrada1" placeholder="HH:MM" value="${dados.entrada1}" maxlength="5"></td><td><input type="text" class="time-input saida1" placeholder="HH:MM" value="${dados.saida1}" maxlength="5"></td><td><input type="text" class="time-input entrada2" placeholder="HH:MM" value="${dados.entrada2}" maxlength="5"></td><td><input type="text" class="time-input saida2" placeholder="HH:MM" value="${dados.saida2}" maxlength="5"></td>`;
        
        row.querySelectorAll('.time-input').forEach((input, idx) => {
            input.addEventListener('input', (e) => { e.target.value = formatarHora(e.target.value); });
            input.addEventListener('change', (e) => { const campos = ['entrada1', 'saida1', 'entrada2', 'saida2']; dados[campos[idx]] = e.target.value; });
        });
        tbody.appendChild(row);
    }
    table.appendChild(thead); table.appendChild(tbody); tableWrapper.appendChild(table); tabsContent.appendChild(tableWrapper);
}

// --- GERENCIAMENTO DE FERIADOS ---
function carregarFeriadosPadrao() {
    const feriadosPadrao = [
        { data: '01/01', descricao: 'Ano Novo' }, { data: '21/04', descricao: 'Tiradentes' }, { data: '01/05', descricao: 'Dia do Trabalho' },
        { data: '07/09', descricao: 'Independência do Brasil' }, { data: '12/10', descricao: 'Nossa Senhora Aparecida' }, { data: '02/11', descricao: 'Finados' },
        { data: '15/11', descricao: 'Proclamação da República' }, { data: '20/11', descricao: 'Consciência Negra' }, { data: '25/12', descricao: 'Natal' }
    ];
    const [mes, ano] = state.competencia.split('/');
    state.feriados = feriadosPadrao.map(f => ({ data: f.data + '/' + ano, descricao: f.descricao }));
}

function abrirModalFeriados() { document.getElementById('feriadosModal').classList.add('active'); renderizarTabelaFeriados(); }
function fecharModalFeriados() { document.getElementById('feriadosModal').classList.remove('active'); }

function adicionarFeriado() {
    const data = document.getElementById('novaDataFeriado').value.trim(); const descricao = document.getElementById('novaDescricaoFeriado').value.trim();
    if (!validarData(data)) { mostrarMensagem('Erro', 'Data inválida. Use o formato DD/MM/AAAA.'); return; }
    if (!descricao) { mostrarMensagem('Erro', 'Descrição é obrigatória.'); return; }
    if (state.feriados.some(f => f.data === data)) { mostrarMensagem('Aviso', 'Este feriado já foi adicionado.'); return; }
    state.feriados.push({ data, descricao }); document.getElementById('novaDataFeriado').value = ''; document.getElementById('novaDescricaoFeriado').value = ''; renderizarTabelaFeriados();
}

function removerFeriado(data) { state.feriados = state.feriados.filter(f => f.data !== data); renderizarTabelaFeriados(); }

function renderizarTabelaFeriados() {
    const tbody = document.getElementById('feriadosTbody'); tbody.innerHTML = '';
    state.feriados.forEach(feriado => {
        const row = document.createElement('tr'); row.innerHTML = `<td>${feriado.data}</td><td>${feriado.descricao}</td><td><button type="button" class="btn-delete" onclick="removerFeriado('${feriado.data}')">Remover</button></td>`; tbody.appendChild(row);
    });
}

function validarData(data) {
    if (!/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/.test(data)) return false;
    const [dia, mes, ano] = data.split('/').map(Number); const dataObj = new Date(ano, mes - 1, dia);
    return dataObj.getFullYear() === ano && dataObj.getMonth() === mes - 1 && dataObj.getDate() === dia;
}

/**
 * Parte 3: Processamento, Cálculos e Resultados
 */

// --- PROCESSAMENTO E CÁLCULOS ---
async function processarFolhaComSalvamento() {
    if (!validarDadosPreProcessamento()) return;
    const jornada = document.getElementById('jornada').value.trim();
    if (!jornada) { mostrarMensagem('Erro', 'Jornada de trabalho é obrigatória.'); return; }
    
    state.jornada = jornada; state.resultados = [];
    state.folhas.forEach(folha => { state.resultados.push(calcularFolha(folha)); });
    
    await salvarFolhaNoSupabase();
    mostrarTela('resultsScreen'); renderizarResultados();
}

function validarDadosPreProcessamento() {
    if (!state.competencia) { mostrarMensagem('Erro', 'Competência não foi carregada.'); return false; }
    if (state.folhas.length === 0) { mostrarMensagem('Erro', 'Adicione pelo menos uma folha de ponto.'); return false; }
    for (let folha of state.folhas) {
        if (!folha.nomeTrabalhador.trim()) { mostrarMensagem('Erro', 'Selecione um empregado para todas as folhas de ponto.'); return false; }
    }
    const nomes = state.folhas.map(f => f.nomeTrabalhador);
    const nomesDuplicados = nomes.filter((nome, idx) => nomes.indexOf(nome) !== idx);
    if (nomesDuplicados.length > 0) { mostrarMensagem('Erro', `O empregado "${nomesDuplicados[0]}" foi selecionado em mais de uma folha.`); return false; }
    
    const jornada = document.getElementById('jornada').value.trim();
    if (!jornada || !validarHora(jornada)) { mostrarMensagem('Erro', 'Jornada de trabalho inválida. Use o formato HH:MM.'); return false; }
    return true;
}

function validarHora(hora) { return /^([01]\d|2[0-3]):([0-5]\d)$/.test(hora); }

function calcularHorasTrabalhadas(entrada, saida) {
    if (entrada === 0 || saida === 0) return 0;
    if (saida < entrada) return (1440 - entrada) + saida;
    return saida - entrada;
}

function calcularFolha(folha) {
    const resultado = {
        nomeTrabalhador: folha.nomeTrabalhador, competencia: state.competencia, dias: [],
        consolidado: { horasTrabalhadas: 0, horasExtras50: 0, horasExtras100Geral: 0, horasExtras100Opcional: 0, horasNoturnaReais: 0, horasNoturnaConvertida: 0, horasDevidas: 0 }
    };
    
    const [mes, ano] = state.competencia.split('/'); const diasNoMes = new Date(ano, mes, 0).getDate();
    const jornada = converterHoraParaMinutos(state.jornada);
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = String(dia).padStart(2, '0') + '/' + mes + '/' + ano;
        const dataObj = new Date(ano, mes - 1, dia);
        const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][dataObj.getDay()];
        const dados = folha.dados[data];
        
        const isFeriado = state.feriados.some(f => f.data === data); const isDSR = dataObj.getDay() === 0;
        
        const entrada1 = converterHoraParaMinutos(dados.entrada1); const saida1 = converterHoraParaMinutos(dados.saida1);
        const entrada2 = converterHoraParaMinutos(dados.entrada2); const saida2 = converterHoraParaMinutos(dados.saida2);
        
        const horasTrabalhadas = calcularHorasTrabalhadas(entrada1, saida1) + calcularHorasTrabalhadas(entrada2, saida2);
        if (horasTrabalhadas === 0) continue;
        
        const horasNoturnaReais = calcularHorasNoturnas(entrada1, saida1, entrada2, saida2);
        const horasNoturnaConvertida = calcularHorasNoturnaConvertida(horasNoturnaReais);
        
        let horasExtras50 = 0; let horasExtras100Geral = 0; let horasExtras100Opcional = 0;
        const horasTrabalhadasAjustadas = horasTrabalhadas + (horasNoturnaConvertida - horasNoturnaReais);
        const horasExtrasTotais = Math.max(0, horasTrabalhadasAjustadas - jornada);
        
        if (isFeriado || isDSR) {
            horasExtras100Geral = horasTrabalhadas;
        } else if (state.ruleExtra100Optional && horasExtrasTotais > 0) {
            const duasHoras = 2 * 60;
            if (horasExtrasTotais <= duasHoras) { horasExtras50 = horasExtrasTotais; } 
            else { horasExtras50 = duasHoras; horasExtras100Opcional = horasExtrasTotais - duasHoras; }
        } else {
            horasExtras50 = horasExtrasTotais;
        }
        
        const horasDevidas = Math.max(0, jornada - horasTrabalhadasAjustadas);
        
        resultado.consolidado.horasTrabalhadas += horasTrabalhadas; resultado.consolidado.horasExtras50 += horasExtras50;
        resultado.consolidado.horasExtras100Geral += horasExtras100Geral; resultado.consolidado.horasExtras100Opcional += horasExtras100Opcional;
        resultado.consolidado.horasNoturnaReais += horasNoturnaReais; resultado.consolidado.horasNoturnaConvertida += horasNoturnaConvertida;
        resultado.consolidado.horasDevidas += horasDevidas;
        
        resultado.dias.push({ data, diaSemana, entrada1: dados.entrada1, saida1: dados.saida1, entrada2: dados.entrada2, saida2: dados.saida2, horasTrabalhadas, horasExtras50, horasExtras100Geral, horasExtras100Opcional, horasNoturnaReais, horasNoturnaConvertida, horasDevidas, isFeriado, isDSR });
    }
    return resultado;
}

function converterHoraParaMinutos(hora) {
    if (!hora || hora.trim() === '') return 0;
    const [h, m] = hora.split(':').map(Number); return h * 60 + m;
}

function converterMinutosParaHora(minutos) {
    const horas = Math.floor(minutos / 60); const mins = minutos % 60;
    return String(horas).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
}

function calcularHorasNoturnas(entrada1, saida1, entrada2, saida2) {
    const inicioNoturno = 22 * 60; const fimNoturno = 5 * 60; let minutosNoturnos = 0;
    if (entrada1 > 0 && saida1 > 0) minutosNoturnos += calcularMinutosNoturnoPeriodo(entrada1, saida1, inicioNoturno, fimNoturno);
    if (entrada2 > 0 && saida2 > 0) minutosNoturnos += calcularMinutosNoturnoPeriodo(entrada2, saida2, inicioNoturno, fimNoturno);
    return minutosNoturnos;
}

function calcularMinutosNoturnoPeriodo(entrada, saida, inicioNoturno, fimNoturno) {
    let minutosNoturnos = 0;
    if (saida < entrada) {
        if (entrada >= inicioNoturno) minutosNoturnos += (24 * 60) - entrada;
        if (saida <= fimNoturno) minutosNoturnos += saida; else minutosNoturnos += fimNoturno;
    } else {
        if (entrada < inicioNoturno && saida > inicioNoturno) minutosNoturnos += saida - inicioNoturno;
        else if (entrada >= inicioNoturno && saida >= inicioNoturno) minutosNoturnos += saida - entrada;
        if (entrada < fimNoturno && saida > entrada) minutosNoturnos += Math.min(saida, fimNoturno) - entrada;
        else if (entrada < fimNoturno && saida >= fimNoturno) minutosNoturnos += fimNoturno - entrada;
    }
    return Math.max(0, minutosNoturnos);
}

function calcularHorasNoturnaConvertida(minutosNoturnos) { return Math.round(minutosNoturnos / 0.875); }

// --- RENDERIZAÇÃO DE RESULTADOS ---
function renderizarResultados() { renderizarConsolidado(); renderizarTabelasDiarias(); }

function renderizarConsolidado() {
    const container = document.getElementById('consolidadoContainer'); container.innerHTML = '';
    state.resultados.forEach(resultado => {
        const card = document.createElement('div'); card.className = 'consolidado-card'; const consolidado = resultado.consolidado;
        let html = `<h3>📊 ${resultado.nomeTrabalhador}</h3><div class="competencia">${resultado.competencia}</div><div class="metric-grid">`;
        html += `<div class="metric-item trabalhadas"><div class="metric-label">Horas Trabalhadas</div><div class="metric-value">${converterMinutosParaHora(consolidado.horasTrabalhadas)}</div></div>`;
        html += `<div class="metric-item extras50"><div class="metric-label">Extras 50%</div><div class="metric-value">${converterMinutosParaHora(consolidado.horasExtras50)}</div></div>`;
        html += `<div class="metric-item extras100"><div class="metric-label">Extras 100% (Feriado)</div><div class="metric-value">${converterMinutosParaHora(consolidado.horasExtras100Geral)}</div></div>`;
        if (consolidado.horasExtras100Opcional > 0) html += `<div class="metric-item extras100"><div class="metric-label">Extras 100% (2ª Hora)</div><div class="metric-value">${converterMinutosParaHora(consolidado.horasExtras100Opcional)}</div></div>`;
        html += `<div class="metric-item noturnas"><div class="metric-label">Not. Reais</div><div class="metric-value">${converterMinutosParaHora(consolidado.horasNoturnaReais)}</div></div>`;
        html += `<div class="metric-item noturnas"><div class="metric-label">Not. Convertida</div><div class="metric-value">${converterMinutosParaHora(consolidado.horasNoturnaConvertida)}</div></div>`;
        html += `<div class="metric-item devidas"><div class="metric-label">Horas Devidas</div><div class="metric-value">${converterMinutosParaHora(consolidado.horasDevidas)}</div></div></div>`;
        card.innerHTML = html; container.appendChild(card);
    });
}

function renderizarTabelasDiarias() {
    const container = document.getElementById('tabelasContainer'); container.innerHTML = '';
    state.resultados.forEach(resultado => {
        const section = document.createElement('div'); section.className = 'tabela-trabalhador';
        section.innerHTML = `<h3>📋 Detalhamento Diário - ${resultado.nomeTrabalhador}</h3>`;
        const tableWrapper = document.createElement('div'); tableWrapper.className = 'tabela-wrapper';
        const table = document.createElement('table'); const thead = document.createElement('thead'); const tbody = document.createElement('tbody');
        thead.innerHTML = '<tr><th>DATA</th><th>DIA</th><th>ENTRADA 1</th><th>SAIDA 1</th><th>ENTRADA 2</th><th>SAIDA 2</th><th>TRABALHADAS</th><th>EXTRAS 50%</th><th>EXTRAS 100% (Feriado)</th><th>EXTRAS 100% (Opcional)</th><th>NOT. REAIS</th><th>NOT. CONV.</th><th>DEVIDAS</th></tr>';
        resultado.dias.forEach(dia => {
            if (dia.entrada1 || dia.saida1 || dia.entrada2 || dia.saida2) {
                const row = document.createElement('tr');
                if (dia.isFeriado) row.classList.add('feriado'); if (dia.isDSR) row.classList.add('dsr');
                row.innerHTML = `<td>${dia.data}</td><td>${dia.diaSemana}</td><td>${dia.entrada1}</td><td>${dia.saida1}</td><td>${dia.entrada2}</td><td>${dia.saida2}</td><td>${converterMinutosParaHora(dia.horasTrabalhadas)}</td><td>${converterMinutosParaHora(dia.horasExtras50)}</td><td>${converterMinutosParaHora(dia.horasExtras100Geral)}</td><td>${converterMinutosParaHora(dia.horasExtras100Opcional)}</td><td>${converterMinutosParaHora(dia.horasNoturnaReais)}</td><td>${converterMinutosParaHora(dia.horasNoturnaConvertida)}</td><td>${converterMinutosParaHora(dia.horasDevidas)}</td>`;
                tbody.appendChild(row);
            }
        });
        table.appendChild(thead); table.appendChild(tbody); tableWrapper.appendChild(table); section.appendChild(tableWrapper); container.appendChild(section);
    });
}

/**
 * Parte 4: Exportação Excel, Exportação TXT e Utilitários
 */

// --- EXPORTAÇÃO PARA EXCEL ---
async function exportarParaExcel() {
    try {
        mostrarMensagem('Processando', 'Gerando arquivo Excel...');
        const workbook = XLSX.utils.book_new();
        
        if (!state.resultados || state.resultados.length === 0) {
            mostrarMensagem('Erro', 'Não há dados processados para exportar.');
            return;
        }
        
        console.log('📊 Gerando arquivo Excel com ' + state.resultados.length + ' abas...');
        
        state.resultados.forEach((resultado) => {
            const dados = [];
            dados.push(['FOLHA DE PONTO', '', '', '', '', '', '', '', '', '', '']);
            dados.push(['Empregado: ' + resultado.nomeTrabalhador, '', '', 'Competência: ' + resultado.competencia, '', '', '', '', '', '', '']);
            dados.push([]);
            dados.push(['DATA', 'DIA', 'ENTRADA 1', 'SAIDA 1', 'ENTRADA 2', 'SAIDA 2', 'TRABALHADAS', 'EXTRAS 50%', 'EXTRAS 100%', 'NOT. REAIS', 'NOT. CONV.']);
            
            resultado.dias.forEach(dia => {
                const totalExtras100 = dia.horasExtras100Geral + dia.horasExtras100Opcional;
                dados.push([dia.data, dia.diaSemana, dia.entrada1 || '', dia.saida1 || '', dia.entrada2 || '', dia.saida2 || '', converterMinutosParaHora(dia.horasTrabalhadas), converterMinutosParaHora(dia.horasExtras50), converterMinutosParaHora(totalExtras100), converterMinutosParaHora(dia.horasNoturnaReais), converterMinutosParaHora(dia.horasNoturnaConvertida)]);
            });
            
            dados.push([]); dados.push(['CONSOLIDADO DO MÊS']); dados.push(['DESCRIÇÃO', 'HORAS']);
            const consolidado = resultado.consolidado;
            dados.push(['Horas Trabalhadas', converterMinutosParaHora(consolidado.horasTrabalhadas)]);
            dados.push(['Extras 50%', converterMinutosParaHora(consolidado.horasExtras50)]);
            dados.push(['Extras 100% (Feriado/DSR)', converterMinutosParaHora(consolidado.horasExtras100Geral)]);
            dados.push(['Extras 100% (2ª Hora)', converterMinutosParaHora(consolidado.horasExtras100Opcional)]);
            dados.push(['Noturnas Reais', converterMinutosParaHora(consolidado.horasNoturnaReais)]);
            dados.push(['Noturnas Convertidas', converterMinutosParaHora(consolidado.horasNoturnaConvertida)]);
            dados.push(['Horas Devidas', converterMinutosParaHora(consolidado.horasDevidas)]);
            
            const worksheet = XLSX.utils.aoa_to_sheet(dados);
            worksheet['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(workbook, worksheet, resultado.nomeTrabalhador);
        });
        
        const dadosConsolidado = [];
        dadosConsolidado.push(['CONSOLIDADO MENSAL GERAL', '', '', '', '', '', '', '', '', '', '']);
        dadosConsolidado.push(['Competência: ' + state.competencia, '', '', 'Empresa: ' + state.codigoEmpresa, '', '', '', '', '', '', '']);
        dadosConsolidado.push([]);
        dadosConsolidado.push(['EMPREGADO', 'TRABALHADAS', 'EXTRAS 50%', 'EXTRAS 100% (Feriado)', 'EXTRAS 100% (2ª Hora)', 'NOT. REAIS', 'NOT. CONV.', 'HORAS DEVIDAS']);
        
        let totalTrabalhadas = 0; let totalExtras50 = 0; let totalExtras100Geral = 0; let totalExtras100Opcional = 0; let totalNoturnaReais = 0; let totalNoturnaConvertida = 0; let totalDevidas = 0;
        
        state.resultados.forEach(resultado => {
            const consolidado = resultado.consolidado;
            dadosConsolidado.push([resultado.nomeTrabalhador, converterMinutosParaHora(consolidado.horasTrabalhadas), converterMinutosParaHora(consolidado.horasExtras50), converterMinutosParaHora(consolidado.horasExtras100Geral), converterMinutosParaHora(consolidado.horasExtras100Opcional), converterMinutosParaHora(consolidado.horasNoturnaReais), converterMinutosParaHora(consolidado.horasNoturnaConvertida), converterMinutosParaHora(consolidado.horasDevidas)]);
            totalTrabalhadas += consolidado.horasTrabalhadas; totalExtras50 += consolidado.horasExtras50; totalExtras100Geral += consolidado.horasExtras100Geral; totalExtras100Opcional += consolidado.horasExtras100Opcional; totalNoturnaReais += consolidado.horasNoturnaReais; totalNoturnaConvertida += consolidado.horasNoturnaConvertida; totalDevidas += consolidado.horasDevidas;
        });
        
        dadosConsolidado.push([]); dadosConsolidado.push(['TOTAIS']);
        dadosConsolidado.push(['TOTAL', converterMinutosParaHora(totalTrabalhadas), converterMinutosParaHora(totalExtras50), converterMinutosParaHora(totalExtras100Geral), converterMinutosParaHora(totalExtras100Opcional), converterMinutosParaHora(totalNoturnaReais), converterMinutosParaHora(totalNoturnaConvertida), converterMinutosParaHora(totalDevidas)]);
        
        const worksheetConsolidado = XLSX.utils.aoa_to_sheet(dadosConsolidado);
        worksheetConsolidado['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(workbook, worksheetConsolidado, 'Consolidado Geral');
        
        const nomeArquivo = `Folha_Ponto_${state.codigoEmpresa}_${state.competencia.replace('/', '_')}_${Date.now()}.xlsx`;
        XLSX.writeFile(workbook, nomeArquivo);
        
        try { await supabaseClient.from('saves').update({ data_exportacao: new Date().toISOString(), status: 'processado' }).eq('empresa_codigo', state.codigoEmpresa).eq('competencia', state.competencia); } catch (erro) {}
        mostrarMensagem('Sucesso', `Arquivo exportado com sucesso!\n\nArquivo: ${nomeArquivo}`);
    } catch (erro) { mostrarMensagem('Erro', 'Erro ao exportar arquivo: ' + erro.message); }
}

// --- ✅ NOVA FUNCIONALIDADE: EXPORTAÇÃO TXT ---

function abrirModalExportacaoTXT() {
    document.getElementById('exportCompetencia').value = '';
    document.getElementById('exportEmpresasContainer').style.display = 'none';
    document.getElementById('btnGerarTXT').style.display = 'none';
    document.getElementById('exportTxtModal').classList.add('active');
}

function fecharModalExportacaoTXT() {
    document.getElementById('exportTxtModal').classList.remove('active');
}

async function buscarEmpresasParaExportacao() {
    const competencia = document.getElementById('exportCompetencia').value.trim();
    if (!validarCompetencia(competencia)) { mostrarMensagem('Erro', 'Competência inválida. Use MM/AAAA.'); return; }
    
    try {
        // Buscar empresas que têm saves para esta competência
        const { data, error } = await supabaseClient
            .from('saves')
            .select('empresa_codigo')
            .eq('competencia', competencia);
            
        if (error) throw error;
        
        if (!data || data.length === 0) {
            mostrarMensagem('Aviso', 'Nenhuma folha encontrada para esta competência.');
            return;
        }
        
        // Extrair códigos únicos
        const codigosUnicos = [...new Set(data.map(item => item.empresa_codigo))];
        
        // Buscar nomes das empresas
        const { data: empresasData, error: empError } = await supabaseClient
            .from('empresas')
            .select('codigo_empresa, nome_empresa')
            .in('codigo_empresa', codigosUnicos);
            
        if (empError) throw empError;
        
        renderizarListaEmpresasExportacao(empresasData || []);
        
    } catch (erro) {
        console.error('Erro ao buscar empresas:', erro);
        mostrarMensagem('Erro', 'Erro ao buscar empresas para exportação.');
    }
}

function renderizarListaEmpresasExportacao(empresas) {
    const container = document.getElementById('exportEmpresasList');
    container.innerHTML = '';
    
    if (empresas.length === 0) {
        container.innerHTML = '<p style="color: #7F8C8D; font-size: 13px; text-align: center; margin: 10px 0;">Nenhuma empresa encontrada.</p>';
        return;
    }
    
    empresas.forEach(emp => {
        const div = document.createElement('div');
        div.className = 'checkbox-list-item';
        div.innerHTML = `
            <input type="checkbox" id="chk_emp_${emp.codigo_empresa}" value="${emp.codigo_empresa}">
            <label for="chk_emp_${emp.codigo_empresa}">${emp.codigo_empresa} - ${emp.nome_empresa}</label>
        `;
        container.appendChild(div);
    });
    
    document.getElementById('exportEmpresasContainer').style.display = 'block';
    document.getElementById('btnGerarTXT').style.display = 'inline-flex';
}

async function gerarArquivoTXT() {
    const competencia = document.getElementById('exportCompetencia').value.trim();
    const tipoProcesso = document.getElementById('exportTipoProcesso').value;
    
    // Obter empresas selecionadas
    const checkboxes = document.querySelectorAll('#exportEmpresasList input[type="checkbox"]:checked');
    const empresasSelecionadas = Array.from(checkboxes).map(cb => cb.value);
    
    if (empresasSelecionadas.length === 0) { mostrarMensagem('Erro', 'Selecione pelo menos uma empresa.'); return; }
    if (!tipoProcesso) { mostrarMensagem('Erro', 'Selecione o Tipo do Processo.'); return; }
    
    try {
        mostrarMensagem('Processando', 'Gerando arquivo TXT...');
        
        let txtContent = '';
        // Formatar competência de MM/AAAA para AAAAMM
        const compParts = competencia.split('/');
        const compFormatada = compParts[1] + compParts[0]; 
        
        for (const codigoEmpresa of empresasSelecionadas) {
            // 1. Buscar Rubricas da Empresa
            const { data: rubricasData } = await supabaseClient.from('rubricas').select('*').eq('codigo_empresa', codigoEmpresa);
            const rubricasMap = {};
            (rubricasData || []).forEach(r => { rubricasMap[r.evento] = r.codigo_rubrica; });
            
            // 2. Buscar Folhas Salvas (Todas as versões)
            const { data: savesDataRaw } = await supabaseClient.from('saves').select('*').eq('empresa_codigo', codigoEmpresa).eq('competencia', competencia);
            
            if (!savesDataRaw || savesDataRaw.length === 0) continue;
            
            // ✅ CORREÇÃO DE DUPLICIDADE: Filtrar para manter apenas a última versão de cada empregado
            const savesData = filtrarUltimasVersoes(savesDataRaw);
            
            // 3. Buscar Códigos dos Empregados
            const nomesEmpregados = savesData.map(s => s.nome_trabalhador);
            const { data: empData } = await supabaseClient.from('empregados').select('nome_empregado, codigo_empregado').eq('codigo_empresa', codigoEmpresa).in('nome_empregado', nomesEmpregados);
            const empMap = {};
            (empData || []).forEach(e => { empMap[e.nome_empregado] = e.codigo_empregado; });
            
            // 4. Processar cada folha (agora única por empregado) e gerar linhas
            for (const save of savesData) {
                const dadosJson = JSON.parse(save.dados_json);
                const feriadosJson = JSON.parse(save.feriados_json || '[]');
                
                // Recalcular consolidado (simulação rápida baseada nos dados salvos)
                const folhaTemp = { nomeTrabalhador: save.nome_trabalhador, dados: dadosJson };
                
                // Temporariamente sobrescrever o state para usar a função calcularFolha
                const oldCompetencia = state.competencia;
                const oldJornada = state.jornada;
                const oldRule = state.ruleExtra100Optional;
                const oldFeriados = state.feriados;
                
                state.competencia = save.competencia;
                state.jornada = save.jornada;
                state.ruleExtra100Optional = save.rule_extra_100_opcional;
                state.feriados = feriadosJson;
                
                const resultado = calcularFolha(folhaTemp);
                
                // Restaurar state
                state.competencia = oldCompetencia;
                state.jornada = oldJornada;
                state.ruleExtra100Optional = oldRule;
                state.feriados = oldFeriados;
                
                const consolidado = resultado.consolidado;
                const codEmpregado = empMap[save.nome_trabalhador] || '0';
                
                // ✅ UNIFICAÇÃO DAS HORAS EXTRAS 100%
                const totalExtras100 = consolidado.horasExtras100Geral + consolidado.horasExtras100Opcional;
                
                // Mapeamento de eventos para o TXT
                const eventosParaExportar = [
                    { chave: 'horasTrabalhadas', valor: consolidado.horasTrabalhadas },
                    { chave: 'horasExtras50', valor: consolidado.horasExtras50 },
                    { chave: 'horasExtras100', valor: totalExtras100 }, // ✅ Usa o valor somado
                    { chave: 'horasNoturnaConvertida', valor: consolidado.horasNoturnaConvertida },
                    { chave: 'horasDevidas', valor: consolidado.horasDevidas }
                ];
                
                for (const evento of eventosParaExportar) {
                    if (evento.valor > 0) {
                        const codRubrica = rubricasMap[evento.chave];
                        
                        // Só exporta se a rubrica estiver cadastrada para este evento na empresa
                        if (codRubrica) {
                            // Formatação Layout rigoroso
                            const fixo = "10";
                            const empFormatado = String(codEmpregado).padStart(10, '0');
                            const rubFormatada = String(codRubrica).padStart(9, '0');
                            const tipoProcFormatado = String(tipoProcesso).padStart(2, '0');
                            const valFormatado = String(evento.valor).padStart(9, '0');
                            const empresaFormatada = String(codigoEmpresa).padStart(10, '0');
                            
                            // Montar a linha
                            const linha = `${fixo}${empFormatado}${compFormatada}${rubFormatada}${tipoProcFormatado}${valFormatado}${empresaFormatada}\n`;
                            txtContent += linha;
                        }
                    }
                }
            }
        }
        
        if (txtContent === '') {
            mostrarMensagem('Aviso', 'Nenhum dado encontrado para exportação ou rubricas não cadastradas para os eventos gerados.');
            return;
        }
        
        // Criar e baixar o arquivo TXT
        const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Exportacao_Folha_${compFormatada}_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        fecharModalExportacaoTXT();
        mostrarMensagem('Sucesso', 'Arquivo TXT gerado com sucesso!');
        
    } catch (erro) {
        console.error('Erro ao gerar TXT:', erro);
        mostrarMensagem('Erro', 'Erro ao gerar arquivo TXT: ' + erro.message);
    }
}

// --- NAVEGAÇÃO ENTRE TELAS ---
function mostrarTela(telaId) {
    document.querySelectorAll('.screen').forEach(screen => { screen.classList.remove('active'); });
    document.getElementById(telaId).classList.add('active');
}

function voltarParaEdicao() { mostrarTela('mainScreen'); }

async function resetarDadosComSupabase() {
    mostrarConfirmacao('Limpar Dados', 'Deseja limpar todos os dados e retornar à tela inicial?', async () => {
        try {
            if (state.competencia && state.codigoEmpresa) {
                await supabaseClient.from('saves').update({ status: 'deletado' }).eq('empresa_codigo', state.codigoEmpresa).eq('competencia', state.competencia);
            }
        } catch (erro) { console.error('Erro ao limpar dados remotos:', erro); }
        pararAutoSave(); state.folhas = []; state.abaSelecionada = 0;
        document.getElementById('selectionForm').reset(); mostrarTela('selectionScreen');
    });
}

// --- MODAIS ---
function mostrarMensagem(titulo, mensagem) {
    document.getElementById('messageTitle').textContent = titulo;
    document.getElementById('messageText').textContent = mensagem;
    document.getElementById('messageModal').classList.add('active');
}

function fecharModalMensagem() { document.getElementById('messageModal').classList.remove('active'); }

function mostrarConfirmacao(titulo, mensagem, callback) {
    document.getElementById('confirmTitle').textContent = titulo;
    document.getElementById('confirmMessage').textContent = mensagem;
    window.confirmCallback = callback;
    document.getElementById('confirmModal').classList.add('active');
}

function confirmarAcao() { if (window.confirmCallback) { window.confirmCallback(); } fecharModalConfirmacao(); }
function fecharModalConfirmacao() { document.getElementById('confirmModal').classList.remove('active'); window.confirmCallback = null; }

// --- FORMATADORES ---
function formatarCompetencia(valor) {
    valor = valor.replace(/\D/g, '');
    if (valor.length >= 2) return valor.substring(0, 2) + '/' + valor.substring(2, 6);
    return valor;
}

function formatarHora(valor) {
    valor = valor.replace(/\D/g, '');
    if (valor.length >= 2) return valor.substring(0, 2) + ':' + valor.substring(2, 4);
    return valor;
}

function formatarData(valor) {
    const apenasDigitos = valor.replace(/\D/g, '');
    if (apenasDigitos.length <= 2) return apenasDigitos;
    else if (apenasDigitos.length <= 4) return apenasDigitos.substring(0, 2) + '/' + apenasDigitos.substring(2, 4);
    else return apenasDigitos.substring(0, 2) + '/' + apenasDigitos.substring(2, 4) + '/' + apenasDigitos.substring(4, 8);
}

// --- SALVAMENTO AO SAIR ---
window.addEventListener('beforeunload', () => { pararAutoSave(); salvarFolhaNoSupabase(); });