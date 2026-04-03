// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando sistema...');
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (user) {
        state.usuarioAutenticado = true;
        state.usuarioId = user.id;
        state.usuarioEmail = user.email;
        console.log('✅ Usuário autenticado:', user.email);
        
        inicializarComSupabase();
        inicializarEventos();
        atualizarHeaderAcoes();
        // ✅ MOSTRAR TELA DE SELEÇÃO (Competência e Empresa)
        mostrarTela('selectionScreen');
    } else {
        console.log('⚠️ Usuário não autenticado');
        inicializarEventos();
        // ✅ MOSTRAR TELA DE LOGIN
        mostrarTela('loginScreen');
    }
    
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Evento de autenticação:', event);
        
        if (event === 'SIGNED_IN' && session) {
            state.usuarioAutenticado = true;
            state.usuarioId = session.user.id;
            state.usuarioEmail = session.user.email;
            
            inicializarComSupabase();
            atualizarHeaderAcoes();
            // ✅ MOSTRAR TELA DE SELEÇÃO
            mostrarTela('selectionScreen');
        } else if (event === 'SIGNED_OUT') {
            state.usuarioAutenticado = false;
            state.usuarioId = null;
            state.usuarioEmail = null;
            pararAutoSave();
            
            const headerActions = document.getElementById('headerActions');
            if (headerActions) {
                headerActions.innerHTML = '';
            }
            
            // ✅ VOLTAR PARA LOGIN
            mostrarTela('loginScreen');
        }
    });
});

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
// AUTENTICAÇÃO - LOGOUT
// ============================================
async function fazerLogout(e) {
    if (e) e.preventDefault();
    
    mostrarConfirmacao(
        'Sair',
        'Deseja sair do sistema?',
        async () => {
            try {
                console.log('🔄 Iniciando logout...');
                
                const { error } = await supabaseClient.auth.signOut();
                
                if (error) {
                    console.error('❌ Erro ao sair:', error.message);
                    mostrarMensagem('Erro', 'Erro ao fazer logout: ' + error.message);
                    return;
                }
                
                console.log('✅ Logout realizado com sucesso');
                
                state.usuarioAutenticado = false;
                state.usuarioId = null;
                state.usuarioEmail = null;
                state.folhas = [];
                state.abaSelecionada = 0;
                state.competencia = '';
                state.codigoEmpresa = '';
                
                pararAutoSave();
                
                const headerActions = document.getElementById('headerActions');
                if (headerActions) {
                    headerActions.innerHTML = '';
                }
                
                const selectionForm = document.getElementById('selectionForm');
                if (selectionForm) {
                    selectionForm.reset();
                }
                
                mostrarTela('loginScreen');
                
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
// TELA DE SELEÇÃO (Competência e Empresa)
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
    
    // ✅ CARREGAR PREENCHIMENTOS ANTERIORES
    await carregarPreenchimentosAnteriores();
}

function validarCompetencia(competencia) {
    const regex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    return regex.test(competencia);
}