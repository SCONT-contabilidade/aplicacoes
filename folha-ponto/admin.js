<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Administração - SCONT</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        .admin-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .admin-header {
            background: linear-gradient(135deg, #8B3A3A 0%, #6B2A2A 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
        }

        .admin-header h1 {
            margin: 0;
            font-size: 28px;
        }

        .admin-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 30px;
            border-bottom: 2px solid #E0E0E0;
        }

        .admin-tab-btn {
            padding: 12px 20px;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            cursor: pointer;
            font-weight: 600;
            color: #7F8C8D;
            transition: all 0.3s ease;
        }

        .admin-tab-btn:hover {
            color: #8B3A3A;
        }

        .admin-tab-btn.active {
            color: #8B3A3A;
            border-bottom-color: #8B3A3A;
        }

        .admin-tab-content {
            display: none;
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .admin-tab-content.active {
            display: block;
        }

        .admin-section {
            margin-bottom: 30px;
        }

        .admin-section h2 {
            color: #8B3A3A;
            margin-bottom: 20px;
            font-size: 20px;
            border-bottom: 2px solid #F5F5F5;
            padding-bottom: 10px;
        }

        .upload-area {
            border: 2px dashed #8B3A3A;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            background: #F5F5F5;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .upload-area:hover {
            background: #EEE;
            border-color: #6B2A2A;
        }

        .upload-area.dragover {
            background: #E8E8E8;
            border-color: #6B2A2A;
        }

        .upload-icon {
            font-size: 48px;
            margin-bottom: 15px;
        }

        .upload-text {
            color: #7F8C8D;
            margin-bottom: 10px;
        }

        .upload-hint {
            font-size: 12px;
            color: #95A5A6;
        }

        #fileInput {
            display: none;
        }

        .table-container {
            overflow-x: auto;
            border-radius: 8px;
            border: 1px solid #E0E0E0;
        }

        .admin-table {
            width: 100%;
            border-collapse: collapse;
        }

        .admin-table thead {
            background: linear-gradient(135deg, #8B3A3A 0%, #6B2A2A 100%);
            color: white;
        }

        .admin-table th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
        }

        .admin-table td {
            padding: 12px;
            border-bottom: 1px solid #E0E0E0;
            font-size: 13px;
        }

        .admin-table tbody tr:hover {
            background: #F5F5F5;
        }

        .btn-delete {
            background: #E74C3C;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
        }

        .btn-delete:hover {
            background: #C0392B;
        }

        .btn-edit {
            background: #3498DB;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-right: 5px;
            transition: all 0.3s ease;
        }

        .btn-edit:hover {
            background: #2980B9;
        }

        .form-group {
            margin-bottom: 15px;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #2C3E50;
            font-size: 13px;
        }

        .form-group input,
        .form-group select {
            width: 100%;
            padding: 10px;
            border: 1px solid #E0E0E0;
            border-radius: 6px;
            font-size: 13px;
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #8B3A3A;
            box-shadow: 0 0 0 3px rgba(139, 58, 58, 0.1);
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        .btn-save {
            background: linear-gradient(135deg, #8B3A3A 0%, #6B2A2A 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        }

        .btn-save:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(139, 58, 58, 0.3);
        }

        .status-message {
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            display: none;
        }

        .status-message.success {
            background: #D4EDDA;
            color: #155724;
            border: 1px solid #C3E6CB;
            display: block;
        }

        .status-message.error {
            background: #F8D7DA;
            color: #721C24;
            border: 1px solid #F5C6CB;
            display: block;
        }

        .status-message.info {
            background: #D1ECF1;
            color: #0C5460;
            border: 1px solid #BEE5EB;
            display: block;
        }

        .back-btn {
            display: inline-block;
            margin-bottom: 20px;
            padding: 10px 20px;
            background: #7F8C8D;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            transition: all 0.3s ease;
        }

        .back-btn:hover {
            background: #5D6D7B;
        }

        @media (max-width: 768px) {
            .form-row {
                grid-template-columns: 1fr;
            }

            .admin-tabs {
                flex-direction: column;
            }

            .admin-tab-btn {
                border-bottom: none;
                border-left: 3px solid transparent;
                padding-left: 15px;
            }

            .admin-tab-btn.active {
                border-left-color: #8B3A3A;
                border-bottom-color: transparent;
            }
        }
    </style>
</head>
<body>
    <!-- ============================================
         HEADER
         ============================================ -->
    <div class="header">
        <div class="header-container">
            <img src="https://scontdf.com.br/wp-content/uploads/elementor/thumbs/LogoScont-peic298y16fua1mv1zkur66kgxw0v6rzhu846yyg3k.png" alt="SCONT" class="logo">
            <div class="header-info">
                <h1>SCONT - Administração</h1>
                <div class="header-subtitle">Gestão de Empresas e Empregados</div>
            </div>
            <div class="header-actions">
                <button type="button" class="btn btn-small" onclick="voltarParaPonto()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">
                    ← Voltar
                </button>
            </div>
        </div>
    </div>

    <!-- ============================================
         CONTAINER PRINCIPAL
         ============================================ -->
    <div class="admin-container">
        <!-- ABAS -->
        <div class="admin-tabs">
            <button type="button" class="admin-tab-btn active" onclick="abrirAba('empresas')">
                🏢 Empresas
            </button>
            <button type="button" class="admin-tab-btn" onclick="abrirAba('empregados')">
                👥 Empregados
            </button>
            <button type="button" class="admin-tab-btn" onclick="abrirAba('importar')">
                📥 Importar Dados
            </button>
        </div>

        <!-- ============================================
             ABA EMPRESAS
             ============================================ -->
        <div id="empresas" class="admin-tab-content active">
            <div class="admin-section">
                <h2>Gerenciar Empresas</h2>
                
                <div id="statusEmpresas" class="status-message"></div>

                <div style="margin-bottom: 30px;">
                    <h3 style="color: #2C3E50; margin-bottom: 15px;">Adicionar Nova Empresa</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="codigoEmpresa">Código da Empresa *</label>
                            <input type="text" id="codigoEmpresa" placeholder="Ex: EMP001" maxlength="50">
                        </div>
                        <div class="form-group">
                            <label for="nomeEmpresa">Nome da Empresa *</label>
                            <input type="text" id="nomeEmpresa" placeholder="Ex: Empresa XYZ" maxlength="255">
                        </div>
                    </div>
                    <button type="button" class="btn-save" onclick="adicionarEmpresa()">
                        ➕ Adicionar Empresa
                    </button>
                </div>

                <h3 style="color: #2C3E50; margin-bottom: 15px;">Empresas Cadastradas</h3>
                <div class="table-container">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nome</th>
                                <th>Data de Criação</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="empresasTableBody">
                            <tr>
                                <td colspan="4" style="text-align: center; color: #95A5A6;">Carregando...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- ============================================
             ABA EMPREGADOS
             ============================================ -->
        <div id="empregados" class="admin-tab-content">
            <div class="admin-section">
                <h2>Gerenciar Empregados</h2>
                
                <div id="statusEmpregados" class="status-message"></div>

                <div style="margin-bottom: 30px;">
                    <h3 style="color: #2C3E50; margin-bottom: 15px;">Adicionar Novo Empregado</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="empresaSelect">Empresa *</label>
                            <select id="empresaSelect" onchange="atualizarSelectEmpresa()">
                                <option value="">Selecione uma empresa...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="codigoEmpregado">Código do Empregado *</label>
                            <input type="text" id="codigoEmpregado" placeholder="Ex: EMP001" maxlength="50">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="nomeEmpregado">Nome do Empregado *</label>
                        <input type="text" id="nomeEmpregado" placeholder="Ex: João da Silva" maxlength="255">
                    </div>
                    <button type="button" class="btn-save" onclick="adicionarEmpregado()">
                        ➕ Adicionar Empregado
                    </button>
                </div>

                <h3 style="color: #2C3E50; margin-bottom: 15px;">Empregados Cadastrados</h3>
                <div class="table-container">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Empresa</th>
                                <th>Código</th>
                                <th>Nome</th>
                                <th>Data de Criação</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="empregadosTableBody">
                            <tr>
                                <td colspan="5" style="text-align: center; color: #95A5A6;">Carregando...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- ============================================
             ABA IMPORTAR
             ============================================ -->
        <div id="importar" class="admin-tab-content">
            <div class="admin-section">
                <h2>Importar Dados da Planilha</h2>
                
                <div id="statusImportar" class="status-message"></div>

                <div style="margin-bottom: 30px;">
                    <h3 style="color: #2C3E50; margin-bottom: 15px;">Instruções</h3>
                    <div style="background: #F5F5F5; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
                        <p><strong>Sua planilha deve conter:</strong></p>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li><strong>Aba "Empresas":</strong> Coluna A = Código da Empresa, Coluna B = Nome da Empresa</li>
                            <li><strong>Aba "Empregados":</strong> Coluna A = Código da Empresa, Coluna B = Código do Empregado, Coluna C = Nome do Empregado</li>
                        </ul>
                        <p style="margin-top: 15px; color: #E74C3C;"><strong>⚠️ Aviso:</strong> A importação irá <strong>substituir</strong> todos os dados existentes!</p>
                    </div>
                </div>

                <div class="upload-area" id="uploadArea" onclick="document.getElementById('fileInput').click()">
                    <div class="upload-icon">📊</div>
                    <div class="upload-text"><strong>Clique para selecionar ou arraste a planilha aqui</strong></div>
                    <div class="upload-hint">Formatos aceitos: .xlsx, .xls, .csv</div>
                </div>

                <input type="file" id="fileInput" accept=".xlsx,.xls,.csv" onchange="handleFileSelect(event)">

                <div id="importProgress" style="display: none; margin-top: 20px;">
                    <div style="background: #D1ECF1; padding: 15px; border-radius: 8px; color: #0C5460;">
                        <strong>Processando importação...</strong>
                        <div style="margin-top: 10px; background: white; border-radius: 4px; height: 20px; overflow: hidden;">
                            <div id="progressBar" style="background: #17A2B8; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- ============================================
         MODAL DE MENSAGEM
         ============================================ -->
    <div id="messageModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="messageTitle">Mensagem</h3>
                <button type="button" class="modal-close" onclick="fecharModalMensagem()">×</button>
            </div>
            <div class="modal-body">
                <p id="messageText"></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" onclick="fecharModalMensagem()">OK</button>
            </div>
        </div>
    </div>

    <!-- ============================================
         SCRIPTS
         ============================================ -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script src="admin.js"></script>
</body>
</html>