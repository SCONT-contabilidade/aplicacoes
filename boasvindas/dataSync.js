/**
 * dataSync.js - Sistema centralizado de sincronização de dados
 * Gerencia salvamento e carregamento de dados entre admin.html e client.html
 * 
 * SCONT Soluções Contábeis
 * Data: 10/04/2026
 */

const DataSync = {
    // ===== CONSTANTES =====
    ADMIN_STORAGE_KEY: 'scont_admin_data',
    CLIENT_PREFIX: 'scont_client_',
    
    /**
     * Salva dados do administrador no localStorage
     * @param {Object} companyData - Dados da empresa
     * @param {Object} contentData - Conteúdo customizável
     * @returns {Object} Dados salvos
     */
    saveAdminData(companyData, contentData) {
        const adminData = {
            timestamp: new Date().toISOString(),
            companyData: companyData,
            contentData: contentData
        };
        
        localStorage.setItem(this.ADMIN_STORAGE_KEY, JSON.stringify(adminData));
        console.log('✅ [DataSync] Admin data salvo', adminData);
        return adminData;
    },

    /**
     * Cria e salva um novo cliente
     * @param {Object} companyData - Dados da empresa
     * @param {Object} contentData - Conteúdo customizável
     * @returns {Object} ID, Storage Key e URL do cliente
     */
    createClient(companyData, contentData) {
        const clientId = this.generateClientId();
        const clientData = {
            id: clientId,
            timestamp: new Date().toISOString(),
            companyData: companyData,
            contentData: contentData
        };
        
        const storageKey = this.CLIENT_PREFIX + clientId;
        localStorage.setItem(storageKey, JSON.stringify(clientData));
        
        console.log('💾 [DataSync] Cliente criado:', {
            id: clientId,
            storageKey: storageKey,
            empresa: companyData.razaoSocial
        });
        
        return {
            clientId: clientId,
            storageKey: storageKey,
            url: this.generateClientUrl(clientId)
        };
    },

    /**
     * Carrega dados de um cliente específico
     * @param {String} clientId - ID do cliente
     * @returns {Object|null} Dados do cliente ou null
     */
    loadClient(clientId) {
        if (!clientId) {
            console.error('❌ [DataSync] ClientID não fornecido');
            return null;
        }

        const storageKey = this.CLIENT_PREFIX + clientId;
        console.log('🔍 [DataSync] Procurando cliente:', storageKey);

        const clientDataJson = localStorage.getItem(storageKey);
        
        if (!clientDataJson) {
            console.error('❌ [DataSync] Cliente não encontrado:', storageKey);
            console.log('📋 [DataSync] Clientes disponíveis:', this.listAllClients());
            return null;
        }

        try {
            const clientData = JSON.parse(clientDataJson);
            console.log('✅ [DataSync] Cliente carregado com sucesso');
            return clientData;
        } catch (e) {
            console.error('❌ [DataSync] Erro ao fazer parse do cliente:', e);
            return null;
        }
    },

    /**
     * Lista todos os clientes disponíveis no localStorage
     * @returns {Array} Array com objetos {key, id}
     */
    listAllClients() {
        const clients = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.CLIENT_PREFIX)) {
                clients.push({
                    key: key,
                    id: key.replace(this.CLIENT_PREFIX, '')
                });
            }
        }
        return clients;
    },

    /**
     * Gera ID único para cliente
     * @returns {String} ID único
     */
    generateClientId() {
        return 'client-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Gera URL de acesso ao cliente
     * @param {String} clientId - ID do cliente
     * @returns {String} URL completa
     */
    generateClientUrl(clientId) {
        const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', '').replace('client.html', '');
        return baseUrl + 'client.html?id=' + clientId;
    },

    /**
     * Limpa todos os dados do localStorage
     */
    clearAll() {
        localStorage.clear();
        console.log('🗑️ [DataSync] Todos os dados foram limpos');
    },

    /**
     * Obtém informações de debug
     * @returns {Object} Informações de debug
     */
    getDebugInfo() {
        return {
            adminDataExists: !!localStorage.getItem(this.ADMIN_STORAGE_KEY),
            clientsCount: this.listAllClients().length,
            clients: this.listAllClients(),
            totalItems: localStorage.length,
            browserStorage: navigator.storage ? 'Supported' : 'Not Supported'
        };
    }
};

// ===== VERIFICAÇÃO DE CARREGAMENTO =====
console.log('✅ [DataSync] Script carregado com sucesso');
console.log('📦 [DataSync] Métodos disponíveis:', Object.keys(DataSync));