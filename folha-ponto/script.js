/**
 * SCONT - Sistema de Gestão de Ponto e Folha de Pagamento
 * Arquivo: script.js (VERSÃO v7.1 - COM AUTENTICAÇÃO SUPABASE CORRIGIDA)
 * Descrição: Autenticação, persistência, cálculos e auditoria
 * Data: 04/2026
 */

// ============================================
// CONFIGURAÇÃO SUPABASE
// ============================================
const SUPABASE_URL = 'https://udnikmolgryzczalcbbz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmlrbW9sZ3J5emN6YWxjYmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDQzNTUsImV4cCI6MjA5MDcyMDM1NX0.9vCwDkmxhrLAc-UxKpUxiVHF0BBh8OIdGZPKpTWu-lI';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// ESTADO GLOBAL
// ============================================
const state = {
    usuarioAutenticado: null,
    usuarioEmail: null,
    usuarioId: null,
    competencia: '',
    codigoEmpresa: '',
    jornada: '08:00',
    feriados: [],
    ruleExtra100Optional: false,
    folhas: [],
    abaSelecionada: 0,
    resultados: null
};

const persistenceState = {
    isLoading: false,
    lastSaveTime: null,
    saveInProgress: false,
    autoSaveInterval: null
};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando sistema...');
    
    // Verificar se usuário está autenticado
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (user) {
        // Usuário autenticado
        state.usuarioAutenticado = true;
        state.usuarioId = user.id;
        state.usuarioEmail = user.email;
        console.log('✅ Usuário autenticado:', user.email);
        
        inicializarComSupabase();
        inicializarEventos();
        atualizarHeaderAcoes();
        mostrarTela('initialScreen');
    } else {
        // Usuário não autenticado
        console.log('⚠️ Usuário não autenticado');
        inicializarEventos();
        mostrarTela('loginScreen');
    }
    
    // Monitorar mudanças de autenticação
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Evento de autenticação:', event);
        
        if (event === 'SIGNED_IN' && session) {
            state.usuarioAutenticado = true;
            state.usuarioId = session.user.id;
            state.usuarioEmail = session.user.email;
            
            inicializarComSupabase();
            atualizarHeaderAcoes();
            mostrarTela('initialScreen');
        } else if (event === 'SIGNED_OUT') {
            state.usuarioAutenticado = false;
            state.usuarioId = null;
            state.usuarioEmail = null;
            pararAutoSave();
            mostrarTela('loginScreen');
        }
    });
});

// ============================================
// AUTENTICAÇÃO - LOGIN
// ============================================
async function handleLogin(e) {
    e.preventDefault();
    console.log('🔄 Função handleLogin chamada');
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    console.log('Email:', email);
    console.log('Senha:', password ? '***' : 'vazia');
    
    if (!email || !password) {
        console.error('❌ Email ou senha vazios');
        mostrarMensagem('Erro', 'Preencha email e senha.');
        return;
    }
    
    try {
        console.log('🔄 Tentando login com:', email);
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('❌ Erro de login:', error.message);
            mostrarMensagem('Erro', error.message);
            return;
        }
        
        console.log('✅ Login bem-sucedido!');
        console.log('Usuário:', data.user.email);
        document.getElementById('loginForm').reset();
        
    } catch (erro) {
        console.error('❌ Erro inesperado:', erro);
        mostrarMensagem('Erro', 'Erro ao fazer login. Tente novamente.');
    }
}

// ============================================
// AUTENTICAÇÃO - REGISTRO
// ============================================
async function handleRegistro(e) {
    e.preventDefault();
    
    const nome = document.getElementById('registroNome').value.trim();
    const email = document.getElementById('registroEmail').value.trim();
    const password = document.getElementById('registroPassword').value;
    const passwordConfirm = document.getElementById('registroPasswordConfirm').value;
    
    if (!nome || !email || !password || !passwordConfirm) {
        mostrarMensagem('Erro', 'Preencha todos os campos.');
        return;
    }
    
    if (password !== passwordConfirm) {
        mostrarMensagem('Erro', 'As senhas não conferem.');
        return;
    }
    
    if (password.length < 6) {
        mostrarMensagem('Erro', 'Senha deve ter no mínimo 6 caracteres.');
        return;
    }
    
    try {
        console.log('🔄 Criando conta...');
        
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nome: nome
                }
            }
        });
        
        if (error) {
            console.error('❌ Erro:', error.message);
            mostrarMensagem('Erro', error.message);
            return;
        }
        
        console.log('✅ Conta criada com sucesso!');
        mostrarMensagem('Sucesso', 'Conta criada! Confirme seu email através do link encaminhado para sua conta.');
        
        document.getElementById('registroForm').reset();
        
        setTimeout(() => {
            mostrarTelaLogin();
        }, 2000);
        
    } catch (erro) {
        console.error('❌ Erro inesperado:', erro);
        mostrarMensagem('Erro', 'Erro ao criar conta. Tente novamente.');
    }
}

// ============================================
// AUTENTICAÇÃO - LOGOUT (CORRIGIDO)
// ============================================
async function fazerLogout() {
    mostrarConfirmacao(
        'Sair',
        'Deseja sair do sistema?',
        async () => {
            try {
                console.log('🔄 Iniciando logout...');
                
                // Fazer logout no Supabase
                const { error } = await supabaseClient.auth.signOut();
                
                if (error) {
                    console.error('❌ Erro ao sair:', error.message);
                    mostrarMensagem('Erro', 'Erro ao fazer logout: ' + error.message);
                    return;
                }
                
                console.log('✅ Logout realizado com sucesso');
                
                // Limpar estado global
                state.usuarioAutenticado = false;
                state.usuarioId = null;
                state.usuarioEmail = null;
                state.folhas = [];
                state.abaSelecionada = 0;
                state.competencia = '';
                state.codigoEmpresa = '';
                
                // Parar auto-save
                pararAutoSave();
                
                // Limpar header
                const headerActions = document.getElementById('headerActions');
                if (headerActions) {
                    headerActions.innerHTML = '';
                }
                
                // Limpar formulário inicial
                const initialForm = document.getElementById('initialForm');
                if (initialForm) {
                    initialForm.reset();
                }
                
                // Mostrar tela de login
                mostrarTela('loginScreen');
                
                // Limpar campos de login
                const loginForm = document.getElementById('loginForm');
                if (loginForm) {
                    loginForm.reset();
                }
                
                console.log('✅ Tela de login exibida');
                
            } catch (erro) {
                console.error('❌ Erro inesperado:', erro);
                mostrarMensagem('Erro', 'Erro ao fazer logout. Tente novamente.');
            }
        }
    );
}
// ============================================
// NAVEGAÇÃO - TELAS DE LOGIN
// ============================================
function mostrarTelaLogin(e) {
    if (e) e.preventDefault();
    mostrarTela('loginScreen');
}

function mostrarTelaRegistro(e) {
    if (e) e.preventDefault();
    mostrarTela('registroScreen');
}

// ============================================
// ATUALIZAR HEADER COM DADOS DO USUÁRIO
// ============================================
function atualizarHeaderAcoes() {
    const headerActions = document.getElementById('headerActions');
    if (!headerActions) return;
    
    if (state.usuarioAutenticado && state.usuarioEmail) {
        headerActions.innerHTML = `
            <span style="color: white; font-size: 13px; margin-right: 15px;">
                👤 ${state.usuarioEmail}
            </span>
            <button type="button" class="btn btn-small" onclick="fazerLogout()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">
                🚪 Sair
            </button>
        `;
    } else {
        headerActions.innerHTML = '';
    }
}

// ============================================
// PERSISTÊNCIA COM SUPABASE
// ============================================

async function inicializarComSupabase() {
    console.log('🔄 Inicializando persistência com Supabase...');
    
    try {
        const { data, error } = await supabaseClient
            .from('saves')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.warn('⚠️ Supabase indisponível.');
            return;
        }
        
        console.log('✅ Supabase conectado com sucesso');
        iniciarAutoSave();
        
    } catch (erro) {
        console.error('❌ Erro ao inicializar Supabase:', erro);
    }
}

async function salvarFolhaNoSupabase() {
    if (persistenceState.saveInProgress) {
        console.log('⏳ Salvamento já em andamento...');
        return;
    }
    
    if (!state.usuarioAutenticado || !state.competencia || !state.codigoEmpresa || state.folhas.length === 0) {
        return;
    }
    
    persistenceState.saveInProgress = true;
    
    try {
        for (const folha of state.folhas) {
            const saveRecord = {
                usuario_id: state.usuarioId,
                empresa_codigo: state.codigoEmpresa,
                competencia: state.competencia,
                nome_trabalhador: folha.nomeTrabalhador,
                folha_id: folha.id.toString(),
                dados_json: JSON.stringify(folha.dados),
                feriados_json: JSON.stringify(state.feriados),
                jornada: state.jornada,
                rule_extra_100_opcional: state.ruleExtra100Optional,
                data_atualizacao: new Date().toISOString(),
                status: 'em_preenchimento',
                criado_por: state.usuarioId,
                atualizado_por: state.usuarioId
            };
            
            try {
                const { data: existente } = await supabaseClient
                    .from('saves')
                    .select('id')
                    .eq('usuario_id', state.usuarioId)
                    .eq('empresa_codigo', state.codigoEmpresa)
                    .eq('competencia', state.competencia)
                    .eq('folha_id', folha.id.toString())
                    .single();
                
                if (existente) {
                    const { error } = await supabaseClient
                        .from('saves')
                        .update(saveRecord)
                        .eq('id', existente.id);
                    
                    if (error) throw error;
                    console.log('✏️ Folha atualizada:', folha.nomeTrabalhador);
                } else {
                    const { error } = await supabaseClient
                        .from('saves')
                        .insert([saveRecord]);
                    
                    if (error) throw error;
                    console.log('💾 Folha salva:', folha.nomeTrabalhador);
                }
            } catch (erro) {
                console.warn('⚠️ Erro ao salvar no Supabase:', erro);
            }
        }
        
        persistenceState.lastSaveTime = new Date();
        console.log('✅ Dados salvos com sucesso');
        
    } catch (erro) {
        console.error('❌ Erro ao salvar:', erro);
    } finally {
        persistenceState.saveInProgress = false;
    }
}

function iniciarAutoSave() {
    if (persistenceState.autoSaveInterval) {
        clearInterval(persistenceState.autoSaveInterval);
    }
    
    persistenceState.autoSaveInterval = setInterval(() => {
        salvarFolhaNoSupabase();
    }, 30000);
    
    console.log('🔄 Auto-save ativado (a cada 30s)');
}

function pararAutoSave() {
    if (persistenceState.autoSaveInterval) {
        clearInterval(persistenceState.autoSaveInterval);
        persistenceState.autoSaveInterval = null;
    }
}

async function carregarPreenchimentosAnteriores() {
    try {
        const competencia = document.getElementById('competencia').value.trim();
        const codigoEmpresa = document.getElementById('codigoEmpresa').value.trim();
        
        if (!validarCompetencia(competencia) || !codigoEmpresa) {
            mostrarMensagem('Erro', 'Preencha competência e código da empresa.');
            return;
        }
        
        // Buscar registros no Supabase
        const { data: registros, error } = await supabaseClient
            .from('saves')
            .select('*')
            .eq('empresa_codigo', codigoEmpresa)
            .eq('competencia', competencia)
            .eq('status', 'em_preenchimento')
            .order('data_atualizacao', { ascending: false });
        
        if (error) throw error;
        
        if (!registros || registros.length === 0) {
            console.log('ℹ️ Nenhum preenchimento anterior encontrado.');
            iniciarNovoPreenchimento(competencia, codigoEmpresa);
            return;
        }
        
        // Mostrar modal de seleção
        mostrarModalPreenchimentosAnteriores(registros, competencia, codigoEmpresa);
        
    } catch (erro) {
        console.error('❌ Erro ao carregar preenchimentos:', erro);
        mostrarMensagem('Erro', 'Erro ao carregar preenchimentos anteriores.');
    }
}

function mostrarModalPreenchimentosAnteriores(registros, competencia, codigoEmpresa) {
    const modal = document.createElement('div');
    modal.id = 'preenchimentosAnterioresModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📋 Preenchimentos Anteriores</h3>
                <button type="button" class="modal-close" onclick="fecharModalPreenchimentos()">×</button>
            </div>
            <div class="modal-body">
                <p>Preenchimentos encontrados para <strong>${codigoEmpresa}</strong> - <strong>${competencia}</strong>:</p>
                <div id="preenchimentosList" class="registros-list"></div>
                <button type="button" class="btn btn-secondary" onclick="iniciarNovoPreenchimento('${competencia}', '${codigoEmpresa}')" style="width: 100%; margin-top: 15px;">
                    ➕ Novo Preenchimento
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const lista = document.getElementById('preenchimentosList');
    registros.forEach((registro, index) => {
        const item = document.createElement('div');
        item.className = 'registro-item';
        
        const dataFormatada = new Date(registro.data_atualizacao).toLocaleString('pt-BR');
        const percentual = calcularPercentualPreenchimento(JSON.parse(registro.dados_json));
        
        item.innerHTML = `
            <div class="registro-info">
                <h4>${registro.nome_trabalhador}</h4>
                <p>Atualizado por: ${registro.atualizado_por || 'Sistema'}</p>
                <p>Data: ${dataFormatada}</p>
                <p>Preenchimento: ${percentual}%</p>
            </div>
            <button type="button" class="btn btn-primary btn-small" onclick="carregarPreenchimentoAnterior(${registro.id})">
                ▶️ Carregar
            </button>
        `;
        lista.appendChild(item);
    });
}

async function carregarPreenchimentoAnterior(saveId) {
    try {
        const { data: registro, error } = await supabaseClient
            .from('saves')
            .select('*')
            .eq('id', saveId)
            .single();
        
        if (error) throw error;
        
        state.competencia = registro.competencia;
        state.codigoEmpresa = registro.empresa_codigo;
        state.jornada = registro.jornada;
        state.ruleExtra100Optional = registro.rule_extra_100_opcional;
        state.feriados = JSON.parse(registro.feriados_json);
        
        const folhaRestaurada = {
            id: parseInt(registro.folha_id),
            nomeTrabalhador: registro.nome_trabalhador,
            dados: JSON.parse(registro.dados_json)
        };
        
        const indexExistente = state.folhas.findIndex(f => f.id === folhaRestaurada.id);
        if (indexExistente >= 0) {
            state.folhas[indexExistente] = folhaRestaurada;
        } else {
            state.folhas.push(folhaRestaurada);
        }
        
        state.abaSelecionada = state.folhas.length - 1;
        
        fecharModalPreenchimentos();
        mostrarTela('mainScreen');
        renderizarAbas();
        renderizarConteudoAba();
        
        mostrarMensagem('Sucesso', `Preenchimento de ${registro.nome_trabalhador} carregado!`);
        console.log('✅ Preenchimento carregado');
        
    } catch (erro) {
        console.error('❌ Erro ao carregar preenchimento:', erro);
        mostrarMensagem('Erro', 'Erro ao carregar preenchimento.');
    }
}

function fecharModalPreenchimentos() {
    const modal = document.getElementById('preenchimentosAnterioresModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

function calcularPercentualPreenchimento(dados) {
    let totalCampos = 0;
    let camposPreenchidos = 0;
    
    Object.values(dados).forEach(dia => {
        totalCampos += 4;
        if (dia.entrada1) camposPreenchidos++;
        if (dia.saida1) camposPreenchidos++;
        if (dia.entrada2) camposPreenchidos++;
        if (dia.saida2) camposPreenchidos++;
    });
    
    return totalCampos > 0 ? Math.round((camposPreenchidos / totalCampos) * 100) : 0;
}

function iniciarNovoPreenchimento(competencia, codigoEmpresa) {
    state.competencia = competencia;
    state.codigoEmpresa = codigoEmpresa;
    state.folhas = [];
    state.abaSelecionada = 0;
    carregarFeriadosPadrao();
    
    fecharModalPreenchimentos();
    mostrarTela('mainScreen');
    adicionarNovaFolha();
    
    console.log('✨ Novo preenchimento iniciado');
    iniciarAutoSave();
}

// ============================================
// INICIALIZAÇÃO DE EVENTOS
// ============================================

function inicializarEventos() {
    console.log('🔄 Inicializando eventos...');
    
    // Eventos de autenticação
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('✅ Formulário de login encontrado');
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.error('❌ Formulário de login NÃO encontrado');
    }
    
    const registroForm = document.getElementById('registroForm');
    if (registroForm) {
        console.log('✅ Formulário de registro encontrado');
        registroForm.addEventListener('submit', handleRegistro);
    } else {
        console.error('❌ Formulário de registro NÃO encontrado');
    }
    
    // Eventos principais
    const initialForm = document.getElementById('initialForm');
    if (initialForm) {
        initialForm.addEventListener('submit', handleCarregarFolhaComPersistencia);
    }
    
    const addTabBtn = document.getElementById('addTabBtn');
    if (addTabBtn) {
        addTabBtn.addEventListener('click', adicionarNovaFolha);
    }
    
    const openFeriadosBtn = document.getElementById('openFeriadosBtn');
    if (openFeriadosBtn) {
        openFeriadosBtn.addEventListener('click', abrirModalFeriados);
    }
    
    const addFeriadoBtn = document.getElementById('addFeriadoBtn');
    if (addFeriadoBtn) {
        addFeriadoBtn.addEventListener('click', adicionarFeriado);
    }
    
    const closeFeriadosBtn = document.getElementById('closeFeriadosBtn');
    if (closeFeriadosBtn) {
        closeFeriadosBtn.addEventListener('click', fecharModalFeriados);
    }
    
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', fecharModalFeriados);
    }
    
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.addEventListener('click', processarFolhaComSalvamento);
    }
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetarDadosComSupabase);
    }
    
    const exportXlsxBtn = document.getElementById('exportXlsxBtn');
    if (exportXlsxBtn) {
        exportXlsxBtn.addEventListener('click', exportarParaCSVeSupabase);
    }
    
    const backToEditBtn = document.getElementById('backToEditBtn');
    if (backToEditBtn) {
        backToEditBtn.addEventListener('click', voltarParaEdicao);
    }
    
    const messageOk = document.getElementById('messageOk');
    if (messageOk) {
        messageOk.addEventListener('click', fecharModalMensagem);
    }
    
    const confirmYes = document.getElementById('confirmYes');
    if (confirmYes) {
        confirmYes.addEventListener('click', confirmarAcao);
    }
    
    const confirmNo = document.getElementById('confirmNo');
    if (confirmNo) {
        confirmNo.addEventListener('click', fecharModalConfirmacao);
    }
    
    const competencia = document.getElementById('competencia');
    if (competencia) {
        competencia.addEventListener('input', (e) => {
            e.target.value = formatarCompetencia(e.target.value);
        });
    }
    
    const jornada = document.getElementById('jornada');
    if (jornada) {
        jornada.addEventListener('input', (e) => {
            e.target.value = formatarHora(e.target.value);
        });
    }
    
    const novaDataFeriado = document.getElementById('novaDataFeriado');
    if (novaDataFeriado) {
        novaDataFeriado.addEventListener('input', (e) => {
            e.target.value = formatarData(e.target.value);
        });
    }
    
    const ruleExtra100Optional = document.getElementById('ruleExtra100Optional');
    if (ruleExtra100Optional) {
        ruleExtra100Optional.addEventListener('change', (e) => {
            state.ruleExtra100Optional = e.target.checked;
        });
    }
    
    console.log('✅ Eventos inicializados');
}

// ============================================
// TELA INICIAL
// ============================================

async function handleCarregarFolhaComPersistencia(e) {
    e.preventDefault();
    
    const competencia = document.getElementById('competencia').value.trim();
    const codigoEmpresa = document.getElementById('codigoEmpresa').value.trim();
    
    if (!validarCompetencia(competencia)) {
        mostrarMensagem('Erro', 'Competência inválida. Use o formato MM/AAAA (ex: 02/2026).');
        return;
    }
    
    if (!codigoEmpresa) {
        mostrarMensagem('Erro', 'Código da empresa é obrigatório.');
        return;
    }
    
    await carregarPreenchimentosAnteriores();
}

function validarCompetencia(competencia) {
    const regex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    return regex.test(competencia);
}

// ============================================
// SISTEMA DE ABAS
// ============================================

function adicionarNovaFolha() {
    const novaFolha = {
        id: Date.now(),
        nomeTrabalhador: '',
        dados: {}
    };
    const [mes, ano] = state.competencia.split('/');
    const diasNoMes = new Date(ano, mes, 0).getDate();
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = String(dia).padStart(2, '0') + '/' + mes + '/' + ano;
        novaFolha.dados[data] = {
            entrada1: '',
            saida1: '',
            entrada2: '',
            saida2: ''
        };
    }
    state.folhas.push(novaFolha);
    state.abaSelecionada = state.folhas.length - 1;
    console.log('Nova folha adicionada. Total:', state.folhas.length);
    renderizarAbas();
    renderizarConteudoAba();
}

function renderizarAbas() {
    const tabsNav = document.getElementById('tabsNav');
    tabsNav.innerHTML = '';
    state.folhas.forEach((folha, index) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'tab-button' + (index === state.abaSelecionada ? ' active' : '');
        tab.innerHTML = `
            <span>${folha.nomeTrabalhador || 'Folha ' + (index + 1)}</span>
            <button type="button" class="tab-close" onclick="event.stopPropagation(); removerFolha(${index})">×</button>
        `;
        tab.addEventListener('click', () => {
            state.abaSelecionada = index;
            renderizarAbas();
            renderizarConteudoAba();
        });
        tabsNav.appendChild(tab);
    });
}

function removerFolha(index) {
    mostrarConfirmacao(
        'Remover Folha',
        'Deseja remover esta folha de ponto?',
        () => {
            state.folhas.splice(index, 1);
            if (state.abaSelecionada >= state.folhas.length) {
                state.abaSelecionada = state.folhas.length - 1;
            }
            renderizarAbas();
            renderizarConteudoAba();
        }
    );
}

// ============================================
// RENDERIZAÇÃO DE CONTEÚDO DA ABA
// ============================================

function renderizarConteudoAba() {
    const tabsContent = document.getElementById('tabsContent');
    tabsContent.innerHTML = '';
    const folha = state.folhas[state.abaSelecionada];
    const [mes, ano] = state.competencia.split('/');
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const header = document.createElement('div');
    header.className = 'tab-content-header';
    header.innerHTML = '<div class="form-group"><label for="nomeTrabalhador">Nome do Trabalhador *</label><input type="text" id="nomeTrabalhador" placeholder="Ex: João da Silva" value="' + folha.nomeTrabalhador + '" maxlength="100"></div>';
    const inputNome = header.querySelector('#nomeTrabalhador');
    inputNome.addEventListener('input', (e) => {
        folha.nomeTrabalhador = e.target.value;
        console.log('Nome atualizado:', folha.nomeTrabalhador);
        renderizarAbas();
    });
    inputNome.addEventListener('change', (e) => {
        folha.nomeTrabalhador = e.target.value;
        renderizarAbas();
    });
    tabsContent.appendChild(header);
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>DATA</th><th>DIA DA SEMANA</th><th>ENTRADA 1</th><th>SAIDA 1</th><th>ENTRADA 2</th><th>SAIDA 2</th>';
    thead.appendChild(headerRow);
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = String(dia).padStart(2, '0') + '/' + mes + '/' + ano;
        const dataObj = new Date(ano, mes - 1, dia);
        const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][dataObj.getDay()];
        const dados = folha.dados[data];
        const row = document.createElement('tr');
        const isFeriado = state.feriados.some(f => f.data === data);
        const isDSR = dataObj.getDay() === 0;
        if (isFeriado || isDSR) {
            row.classList.add(isFeriado ? 'feriado' : 'dsr');
        }
        row.innerHTML = '<td>' + data + '</td><td>' + diaSemana + '</td><td><input type="text" class="time-input entrada1" placeholder="HH:MM" value="' + dados.entrada1 + '" maxlength="5"></td><td><input type="text" class="time-input saida1" placeholder="HH:MM" value="' + dados.saida1 + '" maxlength="5"></td><td><input type="text" class="time-input entrada2" placeholder="HH:MM" value="' + dados.entrada2 + '" maxlength="5"></td><td><input type="text" class="time-input saida2" placeholder="HH:MM" value="' + dados.saida2 + '" maxlength="5"></td>';
        row.querySelectorAll('.time-input').forEach((input, idx) => {
            input.addEventListener('input', (e) => {
                e.target.value = formatarHora(e.target.value);
            });
            input.addEventListener('change', (e) => {
                const campos = ['entrada1', 'saida1', 'entrada2', 'saida2'];
                dados[campos[idx]] = e.target.value;
                console.log(data + ' - ' + campos[idx] + ': ' + e.target.value);
            });
        });
        tbody.appendChild(row);
    }
    table.appendChild(thead);
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    tabsContent.appendChild(tableWrapper);
}

// ============================================
// GERENCIAMENTO DE FERIADOS
// ============================================

function carregarFeriadosPadrao() {
    const feriadosPadrao = [
        { data: '01/01', descricao: 'Ano Novo' },
        { data: '21/04', descricao: 'Tiradentes' },
        { data: '01/05', descricao: 'Dia do Trabalho' },
        { data: '07/09', descricao: 'Independência do Brasil' },
        { data: '12/10', descricao: 'Nossa Senhora Aparecida' },
        { data: '02/11', descricao: 'Finados' },
        { data: '15/11', descricao: 'Proclamação da República' },
        { data: '20/11', descricao: 'Consciência Negra' },
        { data: '25/12', descricao: 'Natal' }
    ];
    const [mes, ano] = state.competencia.split('/');
    state.feriados = feriadosPadrao.map(f => ({
        data: f.data + '/' + ano,
        descricao: f.descricao
    }));
    console.log('Feriados padrão carregados:', state.feriados.length);
}

function abrirModalFeriados() {
    const modal = document.getElementById('feriadosModal');
    modal.classList.add('active');
    renderizarTabelaFeriados();
}

function fecharModalFeriados() {
    const modal = document.getElementById('feriadosModal');
    modal.classList.remove('active');
}

function adicionarFeriado() {
    const data = document.getElementById('novaDataFeriado').value.trim();
    const descricao = document.getElementById('novaDescricaoFeriado').value.trim();
    if (!validarData(data)) {
        console.error('Data inválida:', data);
        mostrarMensagem('Erro', 'Data inválida. Use o formato DD/MM/AAAA (ex: 25/12/2026).');
        return;
    }
    if (!descricao) {
        mostrarMensagem('Erro', 'Descrição é obrigatória.');
        return;
    }
    const feriadoExistente = state.feriados.some(f => f.data === data);
    if (feriadoExistente) {
        mostrarMensagem('Aviso', 'Este feriado já foi adicionado.');
        return;
    }
    state.feriados.push({ data, descricao });
    console.log('Feriado adicionado:', data, descricao);
    document.getElementById('novaDataFeriado').value = '';
    document.getElementById('novaDescricaoFeriado').value = '';
    renderizarTabelaFeriados();
}

function removerFeriado(data) {
    state.feriados = state.feriados.filter(f => f.data !== data);
    console.log('Feriado removido:', data);
    renderizarTabelaFeriados();
}

function renderizarTabelaFeriados() {
    const tbody = document.getElementById('feriadosTbody');
    tbody.innerHTML = '';
    state.feriados.forEach(feriado => {
        const row = document.createElement('tr');
        row.innerHTML = '<td>' + feriado.data + '</td><td>' + feriado.descricao + '</td><td><button type="button" class="btn-delete" onclick="removerFeriado(\'' + feriado.data + '\')">Remover</button></td>';
        tbody.appendChild(row);
    });
}

function validarData(data) {
    const regex = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/;
    if (!regex.test(data)) {
        console.error('Formato de data inválido:', data);
        return false;
    }
    const [dia, mes, ano] = data.split('/').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    const isValidDate =
        dataObj.getFullYear() === ano &&
        dataObj.getMonth() === mes - 1 &&
        dataObj.getDate() === dia;
    if (!isValidDate) {
        console.error('Data inválida (dia/mês incoerente):', data);
        return false;
    }
    console.log('Data validada com sucesso:', data);
    return true;
}

// ============================================
// PROCESSAMENTO E CÁLCULOS
// ============================================

async function processarFolhaComSalvamento() {
    console.log('Iniciando processamento...');
    if (!validarDadosPreProcessamento()) {
        return;
    }
    
    const jornada = document.getElementById('jornada').value.trim();
    if (!jornada) {
        mostrarMensagem('Erro', 'Jornada de trabalho é obrigatória.');
        return;
    }
    
    state.jornada = jornada;
    state.resultados = [];
    state.folhas.forEach(folha => {
        const resultado = calcularFolha(folha);
        state.resultados.push(resultado);
    });
    
    await salvarFolhaNoSupabase();
    
    console.log('Processamento concluído. Resultados:', state.resultados.length);
    mostrarTela('resultsScreen');
    renderizarResultados();
}

function validarDadosPreProcessamento() {
    if (!state.competencia) {
        mostrarMensagem('Erro', 'Competência não foi carregada.');
        return false;
    }
    if (state.folhas.length === 0) {
        mostrarMensagem('Erro', 'Adicione pelo menos uma folha de ponto.');
        return false;
    }
    for (let folha of state.folhas) {
        if (!folha.nomeTrabalhador.trim()) {
            mostrarMensagem('Erro', 'Nome do trabalhador é obrigatório em todas as folhas.');
            return false;
        }
    }
    const jornada = document.getElementById('jornada').value.trim();
    if (!jornada || !validarHora(jornada)) {
        mostrarMensagem('Erro', 'Jornada de trabalho inválida. Use o formato HH:MM.');
        return false;
    }
    return true;
}

function validarHora(hora) {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(hora);
}

function calcularHorasTrabalhadas(entrada, saida) {
    if (entrada === 0 || saida === 0) {
        return 0;
    }
    if (saida < entrada) {
        return (1440 - entrada) + saida;
    }
    return saida - entrada;
}

function calcularFolha(folha) {
    const resultado = {
        nomeTrabalhador: folha.nomeTrabalhador,
        competencia: state.competencia,
        dias: [],
        consolidado: {
            horasTrabalhadas: 0,
            horasExtras50: 0,
            horasExtras100Geral: 0,
            horasExtras100Opcional: 0,
            horasNoturnaReais: 0,
            horasNoturnaConvertida: 0,
            horasDevidas: 0
        }
    };
    const [mes, ano] = state.competencia.split('/');
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const jornada = converterHoraParaMinutos(state.jornada);
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = String(dia).padStart(2, '0') + '/' + mes + '/' + ano;
        const dataObj = new Date(ano, mes - 1, dia);
        const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][dataObj.getDay()];
        const dados = folha.dados[data];
        const isFeriado = state.feriados.some(f => f.data === data);
        const isDSR = dataObj.getDay() === 0;
        const entrada1 = converterHoraParaMinutos(dados.entrada1);
        const saida1 = converterHoraParaMinutos(dados.saida1);
        const entrada2 = converterHoraParaMinutos(dados.entrada2);
        const saida2 = converterHoraParaMinutos(dados.saida2);
        const horasTrabalhadas = calcularHorasTrabalhadas(entrada1, saida1) + calcularHorasTrabalhadas(entrada2, saida2);
        console.log('\n📅 ' + data + ' - ' + diaSemana);
        console.log('  Período 1: ' + dados.entrada1 + ' a ' + dados.saida1 + ' = ' + converterMinutosParaHora(calcularHorasTrabalhadas(entrada1, saida1)));
        console.log('  Período 2: ' + dados.entrada2 + ' a ' + dados.saida2 + ' = ' + converterMinutosParaHora(calcularHorasTrabalhadas(entrada2, saida2)));
        console.log('  Total Trabalhadas: ' + converterMinutosParaHora(horasTrabalhadas));
        const horasNoturnaReais = calcularHorasNoturnas(entrada1, saida1, entrada2, saida2);
        const horasNoturnaConvertida = calcularHorasNoturnaConvertida(horasNoturnaReais);
        let horasExtras50 = 0;
        let horasExtras100Geral = 0;
        let horasExtras100Opcional = 0;
        const horasExtrasTotais = Math.max(0, horasTrabalhadas - jornada);
        if (isFeriado || isDSR) {
            horasExtras100Geral = horasExtrasTotais;
        } else {
            if (state.ruleExtra100Optional && horasExtrasTotais > jornada) {
                horasExtras100Opcional = horasExtrasTotais - jornada;
                horasExtras50 = jornada;
            } else {
                horasExtras50 = horasExtrasTotais;
            }
        }
        const horasDevidas = Math.max(0, jornada - horasTrabalhadas);
        resultado.consolidado.horasTrabalhadas += horasTrabalhadas;
        resultado.consolidado.horasExtras50 += horasExtras50;
        resultado.consolidado.horasExtras100Geral += horasExtras100Geral;
        resultado.consolidado.horasExtras100Opcional += horasExtras100Opcional;
        resultado.consolidado.horasNoturnaReais += horasNoturnaReais;
        resultado.consolidado.horasNoturnaConvertida += horasNoturnaConvertida;
        resultado.consolidado.horasDevidas += horasDevidas;
        resultado.dias.push({
            data,
            diaSemana,
            entrada1: dados.entrada1,
            saida1: dados.saida1,
            entrada2: dados.entrada2,
            saida2: dados.saida2,
            horasTrabalhadas,
            horasExtras50,
            horasExtras100Geral,
            horasExtras100Opcional,
            horasNoturnaReais,
            horasNoturnaConvertida,
            horasDevidas,
            isFeriado,
            isDSR
        });
    }
    return resultado;
}

function converterHoraParaMinutos(hora) {
    if (!hora || hora.trim() === '') return 0;
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
}

function converterMinutosParaHora(minutos) {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return String(horas).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
}

function calcularHorasNoturnas(entrada1, saida1, entrada2, saida2) {
    const inicioNoturno = 22 * 60;
    const fimNoturno = 5 * 60;
    const minutosPorDia = 24 * 60;
    let minutosNoturnos = 0;
    const inicio = Math.min(entrada1, entrada2);
    const fim = Math.max(saida1, saida2);
    if (inicio === 0 || fim === 0) return 0;
    const diaInicial = Math.floor(inicio / minutosPorDia);
    const diaFinal = Math.floor((fim - 1) / minutosPorDia);
    for (let dia = diaInicial; dia <= diaFinal; dia++) {
        const base = dia * minutosPorDia;
        minutosNoturnos += intersecaoMinutos(inicio, fim, base + inicioNoturno, base + minutosPorDia);
        minutosNoturnos += intersecaoMinutos(inicio, fim, base, base + fimNoturno);
    }
    console.log('    → Minutos noturnos calculados: ' + minutosNoturnos + ' min');
    return minutosNoturnos;
}

function intersecaoMinutos(inicioA, fimA, inicioB, fimB) {
    const inicio = Math.max(inicioA, inicioB);
    const fim = Math.min(fimA, fimB);
    return Math.max(0, fim - inicio);
}

function calcularHorasNoturnaConvertida(minutosNoturnos) {
    const minutosConvertidos = Math.round(minutosNoturnos / 0.875);
    return minutosConvertidos;
}

// ============================================
// RENDERIZAÇÃO DE RESULTADOS
// ============================================

function renderizarResultados() {
    renderizarConsolidado();
    renderizarTabelasDiarias();
}

function renderizarConsolidado() {
    const container = document.getElementById('consolidadoContainer');
    container.innerHTML = '';
    state.resultados.forEach(resultado => {
        const card = document.createElement('div');
        card.className = 'consolidado-card';
        const consolidado = resultado.consolidado;
        let html = '<h3>📊 ' + resultado.nomeTrabalhador + '</h3>';
        html += '<div class="competencia">' + resultado.competencia + '</div>';
        html += '<div class="metric-grid">';
        html += '<div class="metric-item trabalhadas"><div class="metric-label">Horas Trabalhadas</div><div class="metric-value">' + converterMinutosParaHora(consolidado.horasTrabalhadas) + '</div></div>';
        html += '<div class="metric-item extras50"><div class="metric-label">Extras 50%</div><div class="metric-value">' + converterMinutosParaHora(consolidado.horasExtras50) + '</div></div>';
        html += '<div class="metric-item extras100"><div class="metric-label">Extras 100% (Feriado)</div><div class="metric-value">' + converterMinutosParaHora(consolidado.horasExtras100Geral) + '</div></div>';
        html += '<div class="metric-item extras100"><div class="metric-label">Extras 100% (Opcional)</div><div class="metric-value">' + converterMinutosParaHora(consolidado.horasExtras100Opcional) + '</div></div>';
        html += '<div class="metric-item noturnas"><div class="metric-label">Not. Reais</div><div class="metric-value">' + converterMinutosParaHora(consolidado.horasNoturnaReais) + '</div></div>';
        html += '<div class="metric-item noturnas"><div class="metric-label">Not. Convertida</div><div class="metric-value">' + converterMinutosParaHora(consolidado.horasNoturnaConvertida) + '</div></div>';
        html += '<div class="metric-item devidas"><div class="metric-label">Horas Devidas</div><div class="metric-value">' + converterMinutosParaHora(consolidado.horasDevidas) + '</div></div>';
        html += '</div>';
        card.innerHTML = html;
        container.appendChild(card);
    });
}

function renderizarTabelasDiarias() {
    const container = document.getElementById('tabelasContainer');
    container.innerHTML = '';
    state.resultados.forEach(resultado => {
        const section = document.createElement('div');
        section.className = 'tabela-trabalhador';
        section.innerHTML = '<h3>📋 Detalhamento Diário - ' + resultado.nomeTrabalhador + '</h3>';
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'tabela-wrapper';
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>DATA</th><th>DIA</th><th>ENTRADA 1</th><th>SAIDA 1</th><th>ENTRADA 2</th><th>SAIDA 2</th><th>TRABALHADAS</th><th>EXTRAS 50%</th><th>EXTRAS 100% (Feriado)</th><th>EXTRAS 100% (Opcional)</th><th>NOT. REAIS</th><th>NOT. CONV.</th><th>DEVIDAS</th>';
        thead.appendChild(headerRow);
        resultado.dias.forEach(dia => {
            if (dia.entrada1 || dia.saida1 || dia.entrada2 || dia.saida2) {
                const row = document.createElement('tr');
                if (dia.isFeriado) row.classList.add('feriado');
                if (dia.isDSR) row.classList.add('dsr');
                row.innerHTML = '<td>' + dia.data + '</td><td>' + dia.diaSemana + '</td><td>' + dia.entrada1 + '</td><td>' + dia.saida1 + '</td><td>' + dia.entrada2 + '</td><td>' + dia.saida2 + '</td><td>' + converterMinutosParaHora(dia.horasTrabalhadas) + '</td><td>' + converterMinutosParaHora(dia.horasExtras50) + '</td><td>' + converterMinutosParaHora(dia.horasExtras100Geral) + '</td><td>' + converterMinutosParaHora(dia.horasExtras100Opcional) + '</td><td>' + converterMinutosParaHora(dia.horasNoturnaReais) + '</td><td>' + converterMinutosParaHora(dia.horasNoturnaConvertida) + '</td><td>' + converterMinutosParaHora(dia.horasDevidas) + '</td>';
                tbody.appendChild(row);
            }
        });
        table.appendChild(thead);
        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        section.appendChild(tableWrapper);
        container.appendChild(section);
    });
}

// ============================================
// EXPORTAÇÃO PARA CSV E UPLOAD PARA SUPABASE
// ============================================

async function exportarParaCSVeSupabase() {
    try {
        mostrarMensagem('Processando', 'Gerando arquivo e enviando para servidor...');
        
        let csv = '';
        
        state.resultados.forEach(resultado => {
            csv += '\n\n=== ' + resultado.nomeTrabalhador + ' - ' + resultado.competencia + ' ===\n';
            csv += 'DATA,DIA,ENTRADA 1,SAIDA 1,ENTRADA 2,SAIDA 2,TRABALHADAS,EXTRAS 50%,EXTRAS 100%,NOT. REAIS,NOT. CONV.,DEVIDAS\n';
            
            resultado.dias.forEach(dia => {
                if (dia.entrada1 || dia.saida1 || dia.entrada2 || dia.saida2) {
                    const totalExtras100 = dia.horasExtras100Geral + dia.horasExtras100Opcional;
                    csv += `${dia.data},${dia.diaSemana},${dia.entrada1},${dia.saida1},${dia.entrada2},${dia.saida2},${converterMinutosParaHora(dia.horasTrabalhadas)},${converterMinutosParaHora(dia.horasExtras50)},${converterMinutosParaHora(totalExtras100)},${converterMinutosParaHora(dia.horasNoturnaReais)},${converterMinutosParaHora(dia.horasNoturnaConvertida)},${converterMinutosParaHora(dia.horasDevidas)}\n`;
                }
            });
            
            csv += '\nCONSOLIDADO DO MÊS\n';
            const consolidado = resultado.consolidado;
            csv += `Horas Trabalhadas,${converterMinutosParaHora(consolidado.horasTrabalhadas)}\n`;
            csv += `Extras 50%,${converterMinutosParaHora(consolidado.horasExtras50)}\n`;
            csv += `Extras 100% (Feriado),${converterMinutosParaHora(consolidado.horasExtras100Geral)}\n`;
            csv += `Extras 100% (Opcional),${converterMinutosParaHora(consolidado.horasExtras100Opcional)}\n`;
            csv += `Noturnas Reais,${converterMinutosParaHora(consolidado.horasNoturnaReais)}\n`;
            csv += `Noturnas Convertidas,${converterMinutosParaHora(consolidado.horasNoturnaConvertida)}\n`;
            csv += `Horas Devidas,${converterMinutosParaHora(consolidado.horasDevidas)}\n`;
        });
        
        // ✅ UPLOAD PARA SUPABASE STORAGE
        const nomeArquivo = `Folha_Ponto_${state.codigoEmpresa}_${state.competencia.replace('/', '_')}_${Date.now()}.csv`;
        const caminhoArquivo = `${state.codigoEmpresa}/${state.competencia}/${nomeArquivo}`;
        
        const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from('folha_ponto')
            .upload(caminhoArquivo, new Blob([csv], { type: 'text/csv;charset=utf-8;' }), {
                cacheControl: '3600',
                upsert: false
            });
        
        if (uploadError) {
            console.warn('⚠️ Erro ao fazer upload para Supabase:', uploadError);
            console.log('💾 Salvando localmente em vez disso...');
            salvarCSVLocalmente(csv, nomeArquivo);
            return;
        }
        
        console.log('✅ Arquivo enviado para Supabase:', uploadData);
        
        // ✅ DOWNLOAD LOCAL
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', nomeArquivo);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        mostrarMensagem('Sucesso', `Arquivo exportado com sucesso!\nArmazenado em: ${caminhoArquivo}`);
        console.log('✅ Arquivo exportado e enviado para Supabase');
        
    } catch (erro) {
        console.error('❌ Erro ao exportar:', erro);
        mostrarMensagem('Erro', 'Erro ao exportar arquivo.');
    }
}

function salvarCSVLocalmente(csv, nomeArquivo) {
    try {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', nomeArquivo);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        mostrarMensagem('Sucesso', 'Arquivo exportado localmente (Supabase indisponível)');
    } catch (erro) {
        console.error('❌ Erro ao salvar localmente:', erro);
        mostrarMensagem('Erro', 'Erro ao exportar arquivo.');
    }
}

// ============================================
// NAVEGAÇÃO ENTRE TELAS
// ============================================

function mostrarTela(telaId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(telaId).classList.add('active');
}

function voltarParaEdicao() {
    mostrarTela('mainScreen');
}

async function resetarDadosComSupabase() {
    mostrarConfirmacao(
        'Limpar Dados',
        'Deseja limpar todos os dados e retornar à tela inicial?',
        async () => {
            try {
                if (state.competencia && state.codigoEmpresa) {
                    await supabaseClient
                        .from('saves')
                        .update({ status: 'deletado' })
                        .eq('usuario_id', state.usuarioId)
                        .eq('empresa_codigo', state.codigoEmpresa)
                        .eq('competencia', state.competencia);
                }
            } catch (erro) {
                console.error('Erro ao limpar dados remotos:', erro);
            }
            
            pararAutoSave();
            state.folhas = [];
            state.abaSelecionada = 0;
            document.getElementById('initialForm').reset();
            mostrarTela('initialScreen');
        }
    );
}

// ============================================
// MODAIS
// ============================================

function mostrarMensagem(titulo, mensagem) {
    document.getElementById('messageTitle').textContent = titulo;
    document.getElementById('messageText').textContent = mensagem;
    document.getElementById('messageModal').classList.add('active');
}

function fecharModalMensagem() {
    document.getElementById('messageModal').classList.remove('active');
}

function mostrarConfirmacao(titulo, mensagem, callback) {
    document.getElementById('confirmTitle').textContent = titulo;
    document.getElementById('confirmMessage').textContent = mensagem;
    window.confirmCallback = callback;
    document.getElementById('confirmModal').classList.add('active');
}

function confirmarAcao() {
    if (window.confirmCallback) {
        window.confirmCallback();
    }
    fecharModalConfirmacao();
}

function fecharModalConfirmacao() {
    document.getElementById('confirmModal').classList.remove('active');
    window.confirmCallback = null;
}

// ============================================
// FORMATADORES
// ============================================

function formatarCompetencia(valor) {
    valor = valor.replace(/\D/g, '');
    if (valor.length >= 2) {
        return valor.substring(0, 2) + '/' + valor.substring(2, 6);
    }
    return valor;
}

function formatarHora(valor) {
    valor = valor.replace(/\D/g, '');
    if (valor.length >= 2) {
        return valor.substring(0, 2) + ':' + valor.substring(2, 4);
    }
    return valor;
}

function formatarData(valor) {
    const apenasDigitos = valor.replace(/\D/g, '');
    if (apenasDigitos.length <= 2) {
        return apenasDigitos;
    } else if (apenasDigitos.length <= 4) {
        return apenasDigitos.substring(0, 2) + '/' + apenasDigitos.substring(2, 4);
    } else {
        return apenasDigitos.substring(0, 2) + '/' + apenasDigitos.substring(2, 4) + '/' + apenasDigitos.substring(4, 8);
    }
}



// ============================================
// SALVAMENTO AO SAIR
// ============================================

window.addEventListener('beforeunload', () => {
    pararAutoSave();
    salvarFolhaNoSupabase();
});