// Importação do Firebase (certifique-se de incluir no HTML)
// <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-auth-compat.js"></script>

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD3e5rXGWsaeHHHx5YO3lwKz5poIwZbLiM",
    authDomain: "quiz-informatica-2025.firebaseapp.com",
    projectId: "quiz-informatica-2025",
    storageBucket: "quiz-informatica-2025.firebasestorage.app",
    messagingSenderId: "1006125147967",
    appId: "1:1006125147967:web:539b201776164523e5558a"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Sistema de Gerenciamento de Quiz com Firebase
class QuizSystem {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.quizzes = [];
        this.questionsBank = [];
        this.currentEditingQuiz = null;
        this.currentEditingQuestion = null;
        this.quizQuestions = [];
        this.pendingAction = null;
        this.unsubscribeCallbacks = [];
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.initAuthStateListener();
    }
    
    initAuthStateListener() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                // Usuário está logado
                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || user.email.split('@')[0],
                    type: 'user' // Tipo padrão, será atualizado após buscar do Firestore
                };
                this.loadUserData(user.uid);
            } else {
                // Usuário não está logado
                this.currentUser = null;
                this.showLoginScreen();
            }
        });
    }
    
    async loadUserData(userId) {
        try {
            // Buscar dados do usuário no Firestore
            const userDoc = await db.collection('users').doc(userId).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.currentUser = {
                    ...this.currentUser,
                    ...userData
                };
            } else {
                // Se não existir, criar documento do usuário
                await db.collection('users').doc(userId).set({
                    name: this.currentUser.name,
                    email: this.currentUser.email,
                    type: 'user',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            this.showAdminPanel();
            this.loadAllData();
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            alert('Erro ao carregar dados do usuário');
        }
    }
    
    async loadAllData() {
        if (!this.currentUser) return;
        
        try {
            // Carregar usuários (apenas para administradores)
            if (this.currentUser.type === 'admin') {
                await this.loadUsers();
            }
            
            // Carregar quizzes
            await this.loadQuizzes();
            
            // Carregar banco de questões
            await this.loadQuestionsBank();
            
            this.updateStats();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
    }
    
    async loadUsers() {
        return new Promise((resolve, reject) => {
            const unsubscribe = db.collection('users')
                .orderBy('createdAt', 'desc')
                .onSnapshot((snapshot) => {
                    this.users = [];
                    snapshot.forEach((doc) => {
                        this.users.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                    this.renderUsers();
                    resolve();
                }, reject);
            
            this.unsubscribeCallbacks.push(unsubscribe);
        });
    }
    
    async loadQuizzes() {
        return new Promise((resolve, reject) => {
            const unsubscribe = db.collection('quizzes')
                .orderBy('createdAt', 'desc')
                .onSnapshot((snapshot) => {
                    this.quizzes = [];
                    snapshot.forEach((doc) => {
                        this.quizzes.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                    this.renderQuizzes();
                    resolve();
                }, reject);
            
            this.unsubscribeCallbacks.push(unsubscribe);
        });
    }
    
    async loadQuestionsBank() {
        return new Promise((resolve, reject) => {
            const unsubscribe = db.collection('questionsBank')
                .orderBy('createdAt', 'desc')
                .onSnapshot((snapshot) => {
                    this.questionsBank = [];
                    snapshot.forEach((doc) => {
                        this.questionsBank.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                    
                    // Se não houver questões, carregar as padrões
                    if (this.questionsBank.length === 0) {
                        this.loadDefaultQuestions();
                    } else {
                        this.renderQuestionsBank();
                    }
                    resolve();
                }, reject);
            
            this.unsubscribeCallbacks.push(unsubscribe);
        });
    }
    
    async loadDefaultQuestions() {
        const defaultQuestions = [
            {
                text: "Quem é considerado o pai da Arquitetura de Von Neumann?",
                category: "arquitetura",
                difficulty: "easy",
                alternatives: [
                    "John Von Neumann",
                    "Alan Turing",
                    "Charles Babbage",
                    "Bill Gates",
                    "Steve Jobs"
                ],
                correctAlternative: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                text: "Qual é a base do sistema binário?",
                category: "sistemas",
                difficulty: "easy",
                alternatives: [
                    "2",
                    "8",
                    "10",
                    "16",
                    "64"
                ],
                correctAlternative: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                text: "Qual componente é conhecido como o 'cérebro' do computador?",
                category: "hardware",
                difficulty: "easy",
                alternatives: [
                    "Processador (CPU)",
                    "Memória RAM",
                    "Disco Rígido",
                    "Placa-mãe",
                    "Placa de vídeo"
                ],
                correctAlternative: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                text: "Qual destes NÃO é um sistema operacional?",
                category: "software",
                difficulty: "medium",
                alternatives: [
                    "Microsoft Word",
                    "Windows",
                    "Linux",
                    "macOS",
                    "Android"
                ],
                correctAlternative: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                text: "O que significa a sigla 'HTTP'?",
                category: "redes",
                difficulty: "medium",
                alternatives: [
                    "HyperText Transfer Protocol",
                    "High Tech Transfer Process",
                    "Hyper Transfer Text Protocol",
                    "High Transfer Text Process",
                    "Hyper Tech Transfer Protocol"
                ],
                correctAlternative: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        ];
        
        try {
            const batch = db.batch();
            defaultQuestions.forEach(question => {
                const docRef = db.collection('questionsBank').doc();
                batch.set(docRef, question);
            });
            await batch.commit();
        } catch (error) {
            console.error('Erro ao carregar questões padrão:', error);
        }
    }
    
    bindEvents() {
        // Login/Register
        document.getElementById('loginTab').addEventListener('click', () => this.switchTab('login'));
        document.getElementById('registerTab').addEventListener('click', () => this.switchTab('register'));
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        
        // Sidebar navigation
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', (e) => this.switchContentTab(e.target.dataset.tab));
        });
        
        // Quiz management
        document.getElementById('createQuizBtn').addEventListener('click', () => this.openQuizModal());
        document.getElementById('quizForm').addEventListener('submit', (e) => this.saveQuiz(e));
        document.getElementById('closeModal').addEventListener('click', () => this.closeQuizModal());
        document.getElementById('cancelQuiz').addEventListener('click', () => this.closeQuizModal());
        document.getElementById('addQuestionToQuiz').addEventListener('click', () => this.openQuestionModal());
        document.getElementById('importToQuizBtn').addEventListener('click', () => this.openImportModal());
        
        // Question management
        document.getElementById('addQuestionBtn').addEventListener('click', () => this.openQuestionModal(null, true));
        document.getElementById('questionForm').addEventListener('submit', (e) => this.saveQuestion(e));
        document.getElementById('closeQuestionModal').addEventListener('click', () => this.closeQuestionModal());
        document.getElementById('cancelQuestion').addEventListener('click', () => this.closeQuestionModal());
        
        // Import/Export
        document.getElementById('importQuestionsBtn').addEventListener('click', () => this.openImportModal(true));
        document.getElementById('exportQuestionsBtn').addEventListener('click', () => this.exportToBank());
        document.getElementById('closeImportModal').addEventListener('click', () => this.closeImportModal());
        document.getElementById('cancelImport').addEventListener('click', () => this.closeImportModal());
        document.getElementById('confirmImport').addEventListener('click', () => this.importQuestions());
        
        // View question modal
        document.getElementById('closeViewModal').addEventListener('click', () => this.closeViewQuestionModal());
        document.getElementById('closeViewQuestion').addEventListener('click', () => this.closeViewQuestionModal());
        
        // Confirmation modal
        document.getElementById('closeConfirmModal').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('cancelConfirm').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('confirmAction').addEventListener('click', () => this.executePendingAction());
        
        // Filtros de importação
        document.getElementById('filterCategory').addEventListener('change', () => this.renderImportQuestions());
        document.getElementById('filterDifficulty').addEventListener('change', () => this.renderImportQuestions());
        
        // Modal backdrops
        document.getElementById('quizModal').addEventListener('click', (e) => {
            if (e.target.id === 'quizModal') this.closeQuizModal();
        });
        document.getElementById('questionModal').addEventListener('click', (e) => {
            if (e.target.id === 'questionModal') this.closeQuestionModal();
        });
        document.getElementById('importModal').addEventListener('click', (e) => {
            if (e.target.id === 'importModal') this.closeImportModal();
        });
        document.getElementById('viewQuestionModal').addEventListener('click', (e) => {
            if (e.target.id === 'viewQuestionModal') this.closeViewQuestionModal();
        });
        document.getElementById('confirmModal').addEventListener('click', (e) => {
            if (e.target.id === 'confirmModal') this.closeConfirmModal();
        });
    }
    
    switchTab(tab) {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        }
    }
    
    async checkAdminExists() {
        try {
            const adminQuery = await db.collection('users')
                .where('type', '==', 'admin')
                .limit(1)
                .get();
            
            const adminExists = !adminQuery.empty;
            const userTypeSelect = document.getElementById('userType');
            
            if (adminExists) {
                userTypeSelect.disabled = true;
                const adminOption = userTypeSelect.querySelector('option[value="admin"]');
                if (adminOption) {
                    adminOption.disabled = true;
                    userTypeSelect.value = 'user';
                }
            }
        } catch (error) {
            console.error('Erro ao verificar administrador:', error);
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            // O onAuthStateChanged irá tratar o restante
        } catch (error) {
            console.error('Erro no login:', error);
            let errorMessage = 'Erro ao fazer login. ';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage += 'Usuário não encontrado.';
                    break;
                case 'auth/wrong-password':
                    errorMessage += 'Senha incorreta.';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'E-mail inválido.';
                    break;
                default:
                    errorMessage += 'Tente novamente.';
            }
            
            alert(errorMessage);
        }
    }
    
    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const type = document.getElementById('userType').value;
        
        try {
            // Criar usuário no Authentication
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Criar documento do usuário no Firestore
            await db.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                type: type,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Se é admin, atualizar a verificação
            if (type === 'admin') {
                await this.checkAdminExists();
            }
            
            alert('Cadastro realizado com sucesso!');
            this.switchTab('login');
            document.getElementById('registerForm').reset();
            
        } catch (error) {
            console.error('Erro no cadastro:', error);
            let errorMessage = 'Erro ao cadastrar. ';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage += 'E-mail já está em uso.';
                    break;
                case 'auth/weak-password':
                    errorMessage += 'Senha muito fraca.';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'E-mail inválido.';
                    break;
                default:
                    errorMessage += 'Tente novamente.';
            }
            
            alert(errorMessage);
        }
    }
    
    async handleLogout() {
        try {
            // Limpar todas as subscriptions
            this.unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
            this.unsubscribeCallbacks = [];
            
            await auth.signOut();
            this.currentUser = null;
            this.users = [];
            this.quizzes = [];
            this.questionsBank = [];
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    }
    
    showAdminPanel() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        document.getElementById('userNameDisplay').textContent = this.currentUser.name;
        
        // Mostrar conteúdo baseado no tipo de usuário
        if (this.currentUser.type !== 'admin') {
            document.querySelector('[data-tab="users"]').style.display = 'none';
            document.querySelector('[data-tab="questions"]').style.display = 'none';
        }
        
        // Verificar se existe admin
        this.checkAdminExists();
    }
    
    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('adminPanel').classList.add('hidden');
    }
    
    switchContentTab(tabName) {
        // Atualizar menu lateral
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Mostrar conteúdo correto
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    }
    
    openQuizModal(quiz = null) {
        this.currentEditingQuiz = quiz;
        this.quizQuestions = quiz ? [...quiz.questions] : [];
        
        const modal = document.getElementById('quizModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('quizForm');
        
        if (quiz) {
            title.textContent = 'Editar Quiz';
            document.getElementById('quizTitle').value = quiz.title;
            document.getElementById('quizDescription').value = quiz.description;
            document.getElementById('quizStatus').value = quiz.status;
        } else {
            title.textContent = 'Criar Novo Quiz';
            form.reset();
        }
        
        this.renderQuizQuestions();
        modal.classList.remove('hidden');
    }
    
    renderQuizQuestions() {
        const container = document.getElementById('quizQuestionsList');
        container.innerHTML = '';
        
        if (this.quizQuestions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">Nenhuma questão adicionada ao quiz.</p>';
            return;
        }
        
        this.quizQuestions.forEach((question, index) => {
            const questionElement = document.createElement('div');
            questionElement.className = 'question-item';
            questionElement.innerHTML = `
                <div class="question-text">${question.text}</div>
                <div class="question-meta">
                    <span class="category-badge ${question.category}">${this.getCategoryName(question.category)}</span>
                    <span class="difficulty-badge ${question.difficulty}">${this.getDifficultyName(question.difficulty)}</span>
                </div>
                <div>
                    <button type="button" class="action-btn edit-btn" onclick="quizSystem.viewQuestion('${question.id}')">Ver</button>
                    <button type="button" class="remove-question" onclick="quizSystem.removeQuestionFromQuiz(${index})" title="Remover questão">&times;</button>
                </div>
            `;
            container.appendChild(questionElement);
        });
    }
    
    removeQuestionFromQuiz(index) {
        this.quizQuestions.splice(index, 1);
        this.renderQuizQuestions();
    }
    
    openQuestionModal(question = null, forBank = false) {
        this.currentEditingQuestion = question;
        this.questionForBank = forBank;
        
        const modal = document.getElementById('questionModal');
        const title = document.getElementById('questionModalTitle');
        const form = document.getElementById('questionForm');
        
        if (question) {
            title.textContent = forBank ? 'Editar Questão do Banco' : 'Editar Questão do Quiz';
            document.getElementById('questionText').value = question.text;
            document.getElementById('questionCategory').value = question.category;
            document.getElementById('questionDifficulty').value = question.difficulty;
            
            // Preencher alternativas
            const alternativeInputs = document.querySelectorAll('.alternative-input');
            question.alternatives.forEach((alt, index) => {
                if (alternativeInputs[index]) {
                    alternativeInputs[index].value = alt;
                }
            });
            
            // Marcar alternativa correta
            const correctRadio = document.querySelector(`input[name="correctAlternative"][value="${question.correctAlternative}"]`);
            if (correctRadio) {
                correctRadio.checked = true;
            }
        } else {
            title.textContent = forBank ? 'Adicionar Questão ao Banco' : 'Adicionar Questão ao Quiz';
            form.reset();
        }
        
        modal.classList.remove('hidden');
    }
    
    async saveQuestion(e) {
        e.preventDefault();
        
        const text = document.getElementById('questionText').value;
        const category = document.getElementById('questionCategory').value;
        const difficulty = document.getElementById('questionDifficulty').value;
        const alternativeInputs = document.querySelectorAll('.alternative-input');
        const correctAlternative = parseInt(document.querySelector('input[name="correctAlternative"]:checked').value);
        
        const alternatives = [];
        alternativeInputs.forEach(input => {
            if (input.value.trim()) {
                alternatives.push(input.value.trim());
            }
        });
        
        if (alternatives.length < 2) {
            alert('É necessário pelo menos 2 alternativas!');
            return;
        }
        
        if (correctAlternative >= alternatives.length) {
            alert('A alternativa correta selecionada não existe!');
            return;
        }
        
        const questionData = {
            text,
            category,
            difficulty,
            alternatives,
            correctAlternative,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            if (this.currentEditingQuestion) {
                // Editar questão existente
                if (this.questionForBank) {
                    await db.collection('questionsBank').doc(this.currentEditingQuestion.id).update(questionData);
                } else {
                    const index = this.quizQuestions.findIndex(q => q.id === this.currentEditingQuestion.id);
                    if (index !== -1) {
                        this.quizQuestions[index] = {
                            ...this.quizQuestions[index],
                            ...questionData
                        };
                    }
                }
            } else {
                // Criar nova questão
                const newQuestion = {
                    ...questionData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                if (this.questionForBank) {
                    await db.collection('questionsBank').add(newQuestion);
                } else {
                    this.quizQuestions.push({
                        id: 'temp-' + Date.now(),
                        ...newQuestion
                    });
                }
            }
            
            if (this.questionForBank) {
                // O Firestore listener irá atualizar automaticamente
            } else {
                this.renderQuizQuestions();
            }
            
            this.closeQuestionModal();
            alert('Questão salva com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar questão:', error);
            alert('Erro ao salvar questão. Tente novamente.');
        }
    }
    
    async saveQuiz(e) {
        e.preventDefault();
        
        const title = document.getElementById('quizTitle').value;
        const description = document.getElementById('quizDescription').value;
        const status = document.getElementById('quizStatus').value;
        
        if (this.quizQuestions.length === 0) {
            alert('É necessário adicionar pelo menos uma questão ao quiz!');
            return;
        }
        
        const quizData = {
            title,
            description,
            status,
            questions: this.quizQuestions,
            questionCount: this.quizQuestions.length,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            if (this.currentEditingQuiz) {
                // Editar quiz existente
                await db.collection('quizzes').doc(this.currentEditingQuiz.id).update(quizData);
            } else {
                // Criar novo quiz
                const newQuiz = {
                    ...quizData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: this.currentUser.uid
                };
                await db.collection('quizzes').add(newQuiz);
            }
            
            this.closeQuizModal();
            alert(`Quiz ${this.currentEditingQuiz ? 'atualizado' : 'criado'} com sucesso!`);
        } catch (error) {
            console.error('Erro ao salvar quiz:', error);
            alert('Erro ao salvar quiz. Tente novamente.');
        }
    }
    
    openImportModal(forBank = false) {
        this.importForBank = forBank;
        this.renderImportQuestions();
        document.getElementById('importModal').classList.remove('hidden');
    }
    
    renderImportQuestions() {
        const container = document.getElementById('importQuestionsList');
        const categoryFilter = document.getElementById('filterCategory').value;
        const difficultyFilter = document.getElementById('filterDifficulty').value;
        
        container.innerHTML = '';
        
        const filteredQuestions = this.questionsBank.filter(question => {
            const categoryMatch = categoryFilter === 'all' || question.category === categoryFilter;
            const difficultyMatch = difficultyFilter === 'all' || question.difficulty === difficultyFilter;
            return categoryMatch && difficultyMatch;
        });
        
        if (filteredQuestions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">Nenhuma questão encontrada com os filtros selecionados.</p>';
            return;
        }
        
        filteredQuestions.forEach(question => {
            const isInQuiz = this.quizQuestions.some(q => q.id === question.id);
            const questionElement = document.createElement('div');
            questionElement.className = 'import-question-item';
            questionElement.innerHTML = `
                <div class="import-question-check">
                    <input type="checkbox" class="question-checkbox" value="${question.id}" ${isInQuiz ? 'disabled' : ''}>
                </div>
                <div class="import-question-content">
                    <div class="import-question-text">${question.text}</div>
                    <div class="import-question-meta">
                        <span class="category-badge ${question.category}">${this.getCategoryName(question.category)}</span>
                        <span class="difficulty-badge ${question.difficulty}">${this.getDifficultyName(question.difficulty)}</span>
                        ${isInQuiz ? '<span style="color: #e74c3c; font-size: 0.8rem;">(Já no quiz)</span>' : ''}
                    </div>
                    <div class="import-question-alternatives">
                        ${question.alternatives.map((alt, index) => 
                            `<div class="${index === question.correctAlternative ? 'correct-alternative' : ''}">
                                ${String.fromCharCode(65 + index)}) ${alt}
                            </div>`
                        ).join('')}
                    </div>
                </div>
            `;
            container.appendChild(questionElement);
        });
    }
    
    importQuestions() {
        const checkboxes = document.querySelectorAll('.question-checkbox:checked');
        const importedQuestions = [];
        
        checkboxes.forEach(checkbox => {
            const questionId = checkbox.value;
            const question = this.questionsBank.find(q => q.id === questionId);
            if (question) {
                if (this.importForBank) {
                    // Importar para o banco (duplicar questão)
                    const newQuestion = {
                        ...question,
                        id: 'temp-' + Date.now() // Novo ID temporário
                    };
                    importedQuestions.push(newQuestion);
                } else {
                    // Importar para o quiz atual
                    if (!this.quizQuestions.some(q => q.id === questionId)) {
                        importedQuestions.push({...question});
                    }
                }
            }
        });
        
        if (importedQuestions.length > 0) {
            if (this.importForBank) {
                // Salvar questões duplicadas no Firestore
                this.saveQuestionsToBank(importedQuestions);
            } else {
                this.quizQuestions.push(...importedQuestions);
                this.renderQuizQuestions();
                alert(`${importedQuestions.length} questões importadas para o quiz com sucesso!`);
            }
            this.closeImportModal();
        } else {
            alert('Nenhuma questão selecionada ou todas as questões selecionadas já estão no destino!');
        }
    }
    
    async saveQuestionsToBank(questions) {
        try {
            const batch = db.batch();
            questions.forEach(question => {
                const docRef = db.collection('questionsBank').doc();
                batch.set(docRef, {
                    ...question,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            await batch.commit();
            alert(`${questions.length} questões importadas para o banco com sucesso!`);
        } catch (error) {
            console.error('Erro ao salvar questões no banco:', error);
            alert('Erro ao importar questões para o banco.');
        }
    }
    
    async exportToBank() {
        if (this.quizQuestions.length === 0) {
            alert('Não há questões no quiz para exportar!');
            return;
        }
        
        try {
            const batch = db.batch();
            let exportedCount = 0;
            
            for (const quizQuestion of this.quizQuestions) {
                // Verificar se a questão já existe no banco
                const existingQuery = await db.collection('questionsBank')
                    .where('text', '==', quizQuestion.text)
                    .limit(1)
                    .get();
                
                if (existingQuery.empty) {
                    const docRef = db.collection('questionsBank').doc();
                    batch.set(docRef, {
                        text: quizQuestion.text,
                        category: quizQuestion.category,
                        difficulty: quizQuestion.difficulty,
                        alternatives: quizQuestion.alternatives,
                        correctAlternative: quizQuestion.correctAlternative,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    exportedCount++;
                }
            }
            
            if (exportedCount > 0) {
                await batch.commit();
                alert(`${exportedCount} questões exportadas para o banco!`);
            } else {
                alert('Todas as questões do quiz já estão no banco!');
            }
        } catch (error) {
            console.error('Erro ao exportar questões:', error);
            alert('Erro ao exportar questões para o banco.');
        }
    }
    
    renderQuestionsBank() {
        const container = document.getElementById('questionsList');
        container.innerHTML = '';
        
        if (this.questionsBank.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">Nenhuma questão no banco.</p>';
            return;
        }
        
        this.questionsBank.forEach(question => {
            const questionElement = document.createElement('div');
            questionElement.className = 'bank-question-item';
            questionElement.innerHTML = `
                <div class="bank-question-header">
                    <div class="bank-question-text">${question.text}</div>
                    <div class="bank-question-actions">
                        <button class="action-btn edit-btn" onclick="quizSystem.editBankQuestion('${question.id}')">Editar</button>
                        <button class="action-btn delete-btn" onclick="quizSystem.showConfirm('excluir questão', () => quizSystem.deleteBankQuestion('${question.id}'))">Excluir</button>
                    </div>
                </div>
                <div class="bank-question-meta">
                    <span class="category-badge ${question.category}">${this.getCategoryName(question.category)}</span>
                    <span class="difficulty-badge ${question.difficulty}">${this.getDifficultyName(question.difficulty)}</span>
                </div>
                <div class="bank-alternatives">
                    ${question.alternatives.map((alt, index) => 
                        `<div class="bank-alternative ${index === question.correctAlternative ? 'correct-alternative' : ''}">
                            <strong>${String.fromCharCode(65 + index)})</strong> ${alt}
                        </div>`
                    ).join('')}
                </div>
            `;
            container.appendChild(questionElement);
        });
    }
    
    editBankQuestion(questionId) {
        const question = this.questionsBank.find(q => q.id === questionId);
        if (question) {
            this.openQuestionModal(question, true);
        }
    }
    
    async deleteBankQuestion(questionId) {
        try {
            await db.collection('questionsBank').doc(questionId).delete();
            this.closeConfirmModal();
        } catch (error) {
            console.error('Erro ao excluir questão:', error);
            alert('Erro ao excluir questão.');
        }
    }
    
    viewQuestion(questionId) {
        const question = this.questionsBank.find(q => q.id === questionId) || 
                        this.quizQuestions.find(q => q.id === questionId);
        
        if (question) {
            document.getElementById('viewQuestionText').textContent = question.text;
            document.getElementById('viewQuestionCategory').textContent = this.getCategoryName(question.category);
            document.getElementById('viewQuestionDifficulty').textContent = this.getDifficultyName(question.difficulty);
            
            const alternativesContainer = document.getElementById('viewQuestionAlternatives');
            alternativesContainer.innerHTML = '';
            
            question.alternatives.forEach((alt, index) => {
                const altElement = document.createElement('div');
                altElement.className = `bank-alternative ${index === question.correctAlternative ? 'correct-alternative' : ''}`;
                altElement.innerHTML = `<strong>${String.fromCharCode(65 + index)})</strong> ${alt}`;
                alternativesContainer.appendChild(altElement);
            });
            
            document.getElementById('viewQuestionModal').classList.remove('hidden');
        }
    }
    
    showConfirm(action, callback) {
        this.pendingAction = callback;
        document.getElementById('confirmTitle').textContent = 'Confirmar ' + action;
        document.getElementById('confirmMessage').textContent = `Tem certeza que deseja ${action}? Esta ação não pode ser desfeita.`;
        document.getElementById('confirmModal').classList.remove('hidden');
    }
    
    executePendingAction() {
        if (this.pendingAction) {
            this.pendingAction();
            this.pendingAction = null;
        }
        this.closeConfirmModal();
    }
    
    // Métodos auxiliares
    getCategoryName(category) {
        const categories = {
            'arquitetura': 'Arquitetura',
            'sistemas': 'Sistemas Numéricos',
            'hardware': 'Hardware',
            'software': 'Software',
            'redes': 'Redes',
            'seguranca': 'Segurança'
        };
        return categories[category] || category;
    }
    
    getDifficultyName(difficulty) {
        const difficulties = {
            'easy': 'Fácil',
            'medium': 'Médio',
            'hard': 'Difícil'
        };
        return difficulties[difficulty] || difficulty;
    }
    
    // Renderização de quizzes
    renderQuizzes() {
        const quizList = document.getElementById('quizList');
        quizList.innerHTML = '';
        
        if (this.quizzes.length === 0) {
            quizList.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">Nenhum quiz criado.</p>';
            return;
        }
        
        this.quizzes.forEach(quiz => {
            const quizElement = document.createElement('div');
            quizElement.className = 'quiz-item';
            quizElement.innerHTML = `
                <div class="quiz-info">
                    <h3>${quiz.title}</h3>
                    <p>${quiz.description} | ${quiz.questionCount} questões | 
                    <span class="status-badge ${quiz.status === 'active' ? 'status-active' : 'status-inactive'}">
                        ${quiz.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span></p>
                </div>
                <div class="quiz-actions">
                    <button class="action-btn edit-btn" onclick="quizSystem.openQuizModal(${JSON.stringify(quiz).replace(/"/g, '&quot;')})">Editar</button>
                    <button class="action-btn activate-btn" onclick="quizSystem.toggleQuizStatus('${quiz.id}', '${quiz.status}')">
                        ${quiz.status === 'active' ? 'Desativar' : 'Ativar'}
                    </button>
                    <button class="action-btn delete-btn" onclick="quizSystem.showConfirm('excluir este quiz', () => quizSystem.deleteQuiz('${quiz.id}'))">Excluir</button>
                </div>
            `;
            quizList.appendChild(quizElement);
        });
    }
    
    async toggleQuizStatus(quizId, currentStatus) {
        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            await db.collection('quizzes').doc(quizId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Erro ao alterar status do quiz:', error);
            alert('Erro ao alterar status do quiz.');
        }
    }
    
    async deleteQuiz(quizId) {
        try {
            await db.collection('quizzes').doc(quizId).delete();
            this.closeConfirmModal();
        } catch (error) {
            console.error('Erro ao excluir quiz:', error);
            alert('Erro ao excluir quiz.');
        }
    }
    
    renderUsers() {
        if (this.currentUser.type !== 'admin') return;
        
        const userList = document.getElementById('userList');
        userList.innerHTML = '';
        
        if (this.users.length === 0) {
            userList.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">Nenhum usuário cadastrado.</p>';
            return;
        }
        
        this.users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <div class="user-info">
                    <h3>${user.name}</h3>
                    <p>${user.email} | ${user.type === 'admin' ? 'Administrador' : 'Usuário'} | 
                    Cadastrado em: ${user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString('pt-BR') : 'Data não disponível'}</p>
                </div>
                <div class="user-actions">
                    <span class="status-badge ${user.type === 'admin' ? 'status-active' : 'status-inactive'}">
                        ${user.type === 'admin' ? 'Administrador' : 'Usuário'}
                    </span>
                </div>
            `;
            userList.appendChild(userElement);
        });
    }
    
    updateStats() {
        document.getElementById('totalUsers').textContent = this.users.length;
        document.getElementById('totalQuizzes').textContent = this.quizzes.length;
        document.getElementById('activeQuizzes').textContent = 
            this.quizzes.filter(q => q.status === 'active').length;
        document.getElementById('totalQuestions').textContent = this.questionsBank.length;
    }
    
    // Métodos de fechamento de modais
    closeQuizModal() {
        document.getElementById('quizModal').classList.add('hidden');
        this.currentEditingQuiz = null;
        this.quizQuestions = [];
        document.getElementById('quizForm').reset();
    }
    
    closeQuestionModal() {
        document.getElementById('questionModal').classList.add('hidden');
        this.currentEditingQuestion = null;
        document.getElementById('questionForm').reset();
    }
    
    closeImportModal() {
        document.getElementById('importModal').classList.add('hidden');
    }
    
    closeViewQuestionModal() {
        document.getElementById('viewQuestionModal').classList.add('hidden');
    }
    
    closeConfirmModal() {
        document.getElementById('confirmModal').classList.add('hidden');
        this.pendingAction = null;
    }
}

// Inicializar o sistema quando a página carregar
let quizSystem;
document.addEventListener('DOMContentLoaded', () => {
    quizSystem = new QuizSystem();
});
