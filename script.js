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
const auth = firebase.auth();
const db = firebase.firestore();

// Estado da aplicação
let currentUser = null;
let currentQuiz = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let quizTimer = null;
let timeRemaining = 0;
let totalTime = 0;
let userQuizId = null;

// Elementos da DOM
const authContainer = document.getElementById('auth-container');
const studentDashboard = document.getElementById('student-dashboard');
const quizContainer = document.getElementById('quiz-container');
const quizResult = document.getElementById('quiz-result');
const loading = document.getElementById('loading');

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    initEventListeners();
    
    // Verificar se há um usuário logado
    auth.onAuthStateChanged(user => {
        if (user) {
            // Usuário está logado
            showLoading();
            getUserData(user.uid).then(userData => {
                currentUser = { ...user, ...userData };
                hideLoading();
                showDashboard();
            }).catch(error => {
                hideLoading();
                console.error('Erro ao carregar dados do usuário:', error);
                auth.signOut();
            });
        } else {
            // Nenhum usuário logado
            hideLoading();
            showAuth();
        }
    });
});

// Funções de loading
function showLoading() {
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

// Inicializar autenticação
function initAuth() {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const forgotPasswordLink = document.getElementById('forgot-password');
    
    // Alternar entre login e cadastro
    loginTab.addEventListener('click', () => {
        switchAuthTab('login');
    });
    
    registerTab.addEventListener('click', () => {
        switchAuthTab('register');
    });
    
    // Login
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            showError('login-error', 'Por favor, preencha todos os campos.');
            return;
        }
        
        showLoading();
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Login bem-sucedido
                document.getElementById('login-error').textContent = '';
                hideLoading();
            })
            .catch((error) => {
                hideLoading();
                showError('login-error', getAuthErrorMessage(error.code));
            });
    });
    
    // Cadastro
    registerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const userType = document.getElementById('register-type').value;
        
        if (!name || !email || !password) {
            showError('register-error', 'Por favor, preencha todos os campos.');
            return;
        }
        
        if (password.length < 6) {
            showError('register-error', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        
        registerUser(name, email, password, userType);
    });
    
    // Recuperação de senha
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Funcionalidade de recuperação de senha em desenvolvimento');
    });
}

// Alternar entre abas de autenticação
function switchAuthTab(tab) {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    }
}

// Registrar novo usuário
function registerUser(name, email, password, userType) {
    showLoading();
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Salvar dados adicionais do usuário no Firestore
            return db.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                userType: userType,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            hideLoading();
            document.getElementById('register-error').textContent = '';
            showSuccess('register-error', 'Cadastro realizado com sucesso!');
            
            // Limpar formulário e mudar para login após 2 segundos
            setTimeout(() => {
                document.getElementById('register-form').reset();
                switchAuthTab('login');
            }, 2000);
        })
        .catch((error) => {
            hideLoading();
            showError('register-error', getAuthErrorMessage(error.code));
        });
}

// Obter dados do usuário
function getUserData(uid) {
    return db.collection('users').doc(uid).get()
        .then(doc => {
            if (doc.exists) {
                return doc.data();
            } else {
                throw new Error('Usuário não encontrado');
            }
        });
}

// Inicializar event listeners
function initEventListeners() {
    // Logout
    document.getElementById('student-logout').addEventListener('click', logout);
    
    // Navegação entre abas
    initTabNavigation();
    
    // Controles do quiz
    initQuizControls();
    
    // Navegação dos resultados
    document.getElementById('back-to-dashboard').addEventListener('click', () => {
        showDashboard();
    });
    
    document.getElementById('new-quiz').addEventListener('click', () => {
        showDashboard();
        setTimeout(() => {
            switchTab('quizzes-tab', 'quizzes-section');
            loadQuizzes();
        }, 100);
    });
    
    document.getElementById('review-quiz').addEventListener('click', () => {
        alert('Funcionalidade de revisão em desenvolvimento');
    });
}

// Inicializar navegação por abas
function initTabNavigation() {
    // Abas do aluno
    document.getElementById('quizzes-tab').addEventListener('click', () => {
        switchTab('quizzes-tab', 'quizzes-section');
        loadQuizzes();
    });
    
    document.getElementById('ranking-tab').addEventListener('click', () => {
        switchTab('ranking-tab', 'ranking-section');
        loadRanking();
    });
    
    document.getElementById('history-tab').addEventListener('click', () => {
        switchTab('history-tab', 'history-section');
        loadUserHistory();
    });
    
    // Botão de sair do quiz
    document.getElementById('exit-quiz-btn').addEventListener('click', confirmExitQuiz);
}

// Inicializar controles do quiz
function initQuizControls() {
    document.getElementById('prev-question').addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            displayQuestion();
        }
    });
    
    document.getElementById('next-question').addEventListener('click', () => {
        if (currentQuestionIndex < currentQuestions.length - 1) {
            currentQuestionIndex++;
            displayQuestion();
        }
    });
    
    document.getElementById('finish-quiz').addEventListener('click', finishQuiz);
    
    // Seleção de opções
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', function() {
            const selectedValue = this.getAttribute('data-value');
            selectOption(selectedValue);
        });
    });
}

// Alternar entre abas
function switchTab(tabId, sectionId) {
    // Remover classe active de todas as abas e seções
    const tabs = document.querySelectorAll('.dashboard-header .tab');
    const sections = document.querySelectorAll('.dashboard-content .section');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    sections.forEach(section => section.classList.remove('active'));
    
    // Adicionar classe active à aba e seção selecionadas
    document.getElementById(tabId).classList.add('active');
    document.getElementById(sectionId).classList.add('active');
}

// Mostrar tela de autenticação
function showAuth() {
    authContainer.classList.remove('hidden');
    studentDashboard.classList.add('hidden');
    quizContainer.classList.add('hidden');
    quizResult.classList.add('hidden');
}

// Mostrar dashboard apropriado
function showDashboard() {
    authContainer.classList.add('hidden');
    quizContainer.classList.add('hidden');
    quizResult.classList.add('hidden');
    
    studentDashboard.classList.remove('hidden');
    document.getElementById('student-name').textContent = currentUser.name;
    loadQuizzes();
}

// Fazer logout
function logout() {
    showLoading();
    auth.signOut().then(() => {
        currentUser = null;
        hideLoading();
        showAuth();
    });
}

// Mostrar erro
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = 'error-message';
}

// Mostrar sucesso
function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = 'success-message';
}

// Obter mensagem de erro amigável
function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/invalid-email': 'E-mail inválido.',
        'auth/user-disabled': 'Esta conta foi desativada.',
        'auth/user-not-found': 'Nenhuma conta encontrada com este e-mail.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/email-already-in-use': 'Este e-mail já está em uso.',
        'auth/weak-password': 'A senha é muito fraca.',
        'auth/operation-not-allowed': 'Operação não permitida.',
        'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.'
    };
    
    return messages[errorCode] || 'Ocorreu um erro. Tente novamente.';
}

// ===============================
// GERENCIAMENTO DE QUIZZES
// ===============================

// Carregar quizzes para alunos
function loadQuizzes() {
    const quizzesList = document.getElementById('quizzes-list');
    quizzesList.innerHTML = '<div class="card"><div class="card-content">Carregando quizzes...</div></div>';
    
    // Buscar quizzes ativos
    db.collection('quizzes')
        .where('status', '==', 'active')
        .get()
        .then(querySnapshot => {
            quizzesList.innerHTML = '';
            
            if (querySnapshot.empty) {
                quizzesList.innerHTML = '<div class="card"><div class="card-content">Nenhum quiz disponível no momento.</div></div>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const quiz = { id: doc.id, ...doc.data() };
                const quizCard = createQuizCard(quiz);
                quizzesList.appendChild(quizCard);
            });
        })
        .catch(error => {
            quizzesList.innerHTML = '<div class="card"><div class="card-content">Erro ao carregar quizzes.</div></div>';
            console.error('Erro ao carregar quizzes:', error);
        });
}

// Criar card de quiz para alunos
function createQuizCard(quiz) {
    const card = document.createElement('div');
    card.className = 'card';
    
    // Verificar se o usuário já iniciou este quiz
    const userQuizRef = db.collection('userQuizzes')
        .where('userId', '==', currentUser.uid)
        .where('quizId', '==', quiz.id)
        .where('status', 'in', ['in-progress', 'completed']);
    
    userQuizRef.get().then(querySnapshot => {
        let buttonText = 'Iniciar Quiz';
        let buttonClass = 'btn btn-primary';
        let statusText = 'Não iniciado';
        let statusClass = 'card-badge';
        
        if (!querySnapshot.empty) {
            const userQuiz = querySnapshot.docs[0].data();
            userQuizId = querySnapshot.docs[0].id;
            
            if (userQuiz.status === 'in-progress') {
                buttonText = 'Continuar Quiz';
                buttonClass = 'btn btn-success';
                statusText = 'Em andamento';
                statusClass = 'card-badge';
            } else if (userQuiz.status === 'completed') {
                buttonText = 'Ver Resultado';
                buttonClass = 'btn btn-secondary';
                statusText = 'Concluído';
                statusClass = 'card-badge';
            }
        }
        
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${quiz.title}</h3>
                <span class="${statusClass}">${statusText}</span>
            </div>
            <div class="card-content">
                <p>${quiz.description || 'Sem descrição'}</p>
            </div>
            <div class="card-meta">
                <span><i class="fas fa-clock"></i> ${quiz.time} min</span>
                <span><i class="fas fa-question-circle"></i> ${quiz.questionsCount} questões</span>
                <span><i class="fas fa-layer-group"></i> ${quiz.category || 'Geral'}</span>
            </div>
            <div class="card-actions">
                <button class="${buttonClass}" data-quiz-id="${quiz.id}">
                    <i class="fas fa-play"></i>
                    <span class="btn-text">${buttonText}</span>
                </button>
            </div>
        `;
        
        const button = card.querySelector('button');
        button.addEventListener('click', () => {
            if (buttonText === 'Ver Resultado') {
                showQuizResult(quiz.id);
            } else {
                startQuiz(quiz);
            }
        });
    });
    
    return card;
}

// ===============================
// QUIZ - EXECUÇÃO (FUNÇÕES CORRIGIDAS)
// ===============================

// Iniciar quiz (função corrigida)
function startQuiz(quiz) {
    currentQuiz = quiz;
    userAnswers = new Array(quiz.questionsCount).fill(null);
    currentQuestionIndex = 0;
    
    // Criar registro do quiz do usuário
    db.collection('userQuizzes').add({
        userId: currentUser.uid,
        quizId: quiz.id,
        status: 'in-progress',
        answers: userAnswers,
        currentQuestionIndex: 0,
        startTime: firebase.firestore.FieldValue.serverTimestamp(),
        attempts: 1,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then((docRef) => {
        userQuizId = docRef.id;
        // Buscar questões do quiz
        loadQuizQuestions(quiz.id);
    })
    .catch(error => {
        alert('Erro ao iniciar quiz: ' + error.message);
    });
}

// Carregar questões do quiz (FUNÇÃO COMPLETAMENTE CORRIGIDA)
function loadQuizQuestions(quizId) {
    showLoading();
    
    console.log('Carregando questões para o quiz:', currentQuiz.title);
    console.log('Categoria do quiz:', currentQuiz.category);
    
    // CORREÇÃO: Buscar questões baseado na categoria do quiz
    let questionsQuery = db.collection('questions');
    
    // Se o quiz tem uma categoria específica, filtrar por ela
    if (currentQuiz.category && currentQuiz.category.trim() !== '') {
        questionsQuery = questionsQuery.where('category', '==', currentQuiz.category);
    }
    
    questionsQuery.get()
        .then(querySnapshot => {
            hideLoading();
            
            if (querySnapshot.empty) {
                alert('Nenhuma questão disponível para este quiz. Tente selecionar outra categoria.');
                return;
            }
            
            const allQuestions = [];
            querySnapshot.forEach(doc => {
                const question = { id: doc.id, ...doc.data() };
                // VERIFICAÇÃO: Garantir que a questão tem o campo 'text' (enunciado)
                if (question.text) {
                    allQuestions.push(question);
                } else {
                    console.warn('Questão sem enunciado (text):', question);
                }
            });
            
            console.log('Total de questões encontradas:', allQuestions.length);
            
            // CORREÇÃO: Selecionar questões aleatórias
            const questionCount = Math.min(currentQuiz.questionsCount, allQuestions.length);
            console.log('Selecionando', questionCount, 'questões de', allQuestions.length, 'disponíveis');
            
            // Embaralhar questões usando Fisher-Yates
            const shuffledQuestions = [...allQuestions];
            for (let i = shuffledQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
            }
            
            // Selecionar as primeiras N questões
            currentQuestions = shuffledQuestions.slice(0, questionCount);
            
            console.log('Questões selecionadas para o quiz:', currentQuestions.length);
            
            // CORREÇÃO: Garantir que userAnswers tenha o tamanho correto
            userAnswers = new Array(currentQuestions.length).fill(null);
            
            // Iniciar quiz
            showQuiz();
        })
        .catch(error => {
            hideLoading();
            console.error('Erro detalhado ao carregar questões:', error);
            alert('Erro ao carregar questões: ' + error.message);
        });
}

// Mostrar tela do quiz
function showQuiz() {
    authContainer.classList.add('hidden');
    studentDashboard.classList.add('hidden');
    quizResult.classList.add('hidden');
    quizContainer.classList.remove('hidden');
    
    // Configurar informações do quiz
    document.getElementById('quiz-title-display').textContent = currentQuiz.title;
    document.getElementById('quiz-description-display').textContent = currentQuiz.description || '';
    
    // Iniciar timer
    totalTime = currentQuiz.time * 60; // Converter para segundos
    timeRemaining = totalTime;
    startTimer();
    
    // Exibir primeira questão
    displayQuestion();
}

// Iniciar timer do quiz
function startTimer() {
    updateTimerDisplay();
    
    quizTimer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            finishQuiz();
        }
    }, 1000);
}

// Atualizar display do timer
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('quiz-timer').textContent = timerText;
    
    // Atualizar progresso do círculo do timer
    const progress = document.getElementById('timer-progress');
    const circumference = 2 * Math.PI * 28;
    const offset = circumference - (timeRemaining / totalTime) * circumference;
    progress.style.strokeDashoffset = offset;
}

// Função auxiliar para atualizar progresso do quiz
function updateQuizProgress() {
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('quiz-progress-text');
    const currentQuestionElement = document.getElementById('current-question');
    const totalQuestionsElement = document.getElementById('total-questions');
    
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `Questão ${currentQuestionIndex + 1}/${currentQuestions.length}`;
    if (currentQuestionElement) currentQuestionElement.textContent = currentQuestionIndex + 1;
    if (totalQuestionsElement) totalQuestionsElement.textContent = currentQuestions.length;
}

// Função auxiliar para atualizar botões de navegação
function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-question');
    const nextButton = document.getElementById('next-question');
    const finishButton = document.getElementById('finish-quiz');
    
    if (prevButton) prevButton.disabled = currentQuestionIndex === 0;
    if (nextButton) nextButton.style.display = currentQuestionIndex === currentQuestions.length - 1 ? 'none' : 'flex';
    if (finishButton) finishButton.classList.toggle('hidden', currentQuestionIndex !== currentQuestions.length - 1);
}

// Exibir questão atual (FUNÇÃO CORRIGIDA - AGORA MOSTRA O ENUNCIADO)
function displayQuestion() {
    if (!currentQuestions || currentQuestions.length === 0 || currentQuestionIndex >= currentQuestions.length) {
        console.error('Nenhuma questão disponível para exibir ou índice inválido');
        console.log('currentQuestions:', currentQuestions);
        console.log('currentQuestionIndex:', currentQuestionIndex);
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    
    console.log('Exibindo questão:', currentQuestionIndex, question);
    
    // CORREÇÃO: Verificar se a questão tem os dados necessários
    if (!question) {
        console.error('Questão não encontrada no índice:', currentQuestionIndex);
        return;
    }
    
    // CORREÇÃO CRÍTICA: Exibir o enunciado da questão (campo 'text')
    const questionTextElement = document.getElementById('question-text');
    const optionATextElement = document.getElementById('option-a-text');
    const optionBTextElement = document.getElementById('option-b-text');
    const optionCTextElement = document.getElementById('option-c-text');
    const optionDTextElement = document.getElementById('option-d-text');
    
    if (questionTextElement) {
        questionTextElement.textContent = question.text || 'Questão sem texto definido';
    }
    
    if (optionATextElement) {
        optionATextElement.textContent = question.options?.a || 'Opção A não definida';
    }
    
    if (optionBTextElement) {
        optionBTextElement.textContent = question.options?.b || 'Opção B não definida';
    }
    
    if (optionCTextElement) {
        optionCTextElement.textContent = question.options?.c || 'Opção C não definida';
    }
    
    if (optionDTextElement) {
        optionDTextElement.textContent = question.options?.d || 'Opção D não definida';
    }
    
    // Atualizar progresso
    updateQuizProgress();
    
    // Limpar seleção anterior
    document.querySelectorAll('.option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Restaurar resposta salva, se houver
    if (userAnswers[currentQuestionIndex]) {
        const selectedOption = document.querySelector(`.option[data-value="${userAnswers[currentQuestionIndex]}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
    }
    
    // Atualizar estado dos botões de navegação
    updateNavigationButtons();
}

// Selecionar opção
function selectOption(value) {
    // Limpar seleção anterior
    document.querySelectorAll('.option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Selecionar nova opção
    const selectedOption = document.querySelector(`.option[data-value="${value}"]`);
    selectedOption.classList.add('selected');
    
    // Salvar resposta
    userAnswers[currentQuestionIndex] = value;
    
    // Atualizar no Firestore
    updateUserQuizProgress();
}

// Atualizar progresso do quiz do usuário
function updateUserQuizProgress() {
    if (!userQuizId) return;
    
    db.collection('userQuizzes').doc(userQuizId).update({
        answers: userAnswers,
        currentQuestionIndex: currentQuestionIndex,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .catch(error => {
        console.error('Erro ao atualizar progresso do quiz:', error);
    });
}

// Confirmar saída do quiz
function confirmExitQuiz() {
    if (confirm('Tem certeza que deseja sair do quiz? Seu progresso será salvo.')) {
        clearInterval(quizTimer);
        showDashboard();
    }
}

// Finalizar quiz
function finishQuiz() {
    clearInterval(quizTimer);
    
    // Calcular pontuação
    let score = 0;
    currentQuestions.forEach((question, index) => {
        if (userAnswers[index] === question.correctAnswer) {
            score++;
        }
    });
    
    const percentage = (score / currentQuestions.length) * 100;
    const timeTaken = totalTime - timeRemaining;
    
    // Atualizar status do quiz do usuário
    db.collection('userQuizzes').doc(userQuizId).update({
        status: 'completed',
        score: score,
        percentage: percentage,
        timeTaken: timeTaken,
        completedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        // Mostrar resultado
        showQuizResult(currentQuiz.id, score, percentage, timeTaken);
    })
    .catch(error => {
        console.error('Erro ao finalizar quiz:', error);
        // Mostrar resultado mesmo com erro
        showQuizResult(currentQuiz.id, score, percentage, timeTaken);
    });
}

// Mostrar resultado do quiz
function showQuizResult(quizId, score = null, percentage = null, timeTaken = null) {
    if (score !== null && percentage !== null) {
        // Exibir resultado recém-calculado
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('score-percentage').textContent = `${percentage.toFixed(1)}%`;
        document.getElementById('score-fraction').textContent = `${score}/${currentQuestions.length}`;
        document.getElementById('correct-answers').textContent = score;
        document.getElementById('wrong-answers').textContent = currentQuestions.length - score;
        document.getElementById('time-taken').textContent = timeText;
        
        // Animar o círculo de progresso
        const circleProgress = document.getElementById('circle-progress');
        const degrees = (percentage / 100) * 360;
        circleProgress.style.transform = `rotate(${degrees}deg)`;
        
        quizContainer.classList.add('hidden');
        quizResult.classList.remove('hidden');
    }
}

// ===============================
// RANKING E RELATÓRIOS
// ===============================

// Carregar ranking
function loadRanking() {
    const rankingList = document.getElementById('ranking-list');
    rankingList.innerHTML = '<div class="card"><div class="card-content">Carregando ranking...</div></div>';
    
    // Buscar todos os quizzes completados
    db.collection('userQuizzes')
        .where('status', '==', 'completed')
        .get()
        .then(querySnapshot => {
            const userScores = {};
            
            // Calcular pontuação total por usuário
            querySnapshot.forEach(doc => {
                const userQuiz = doc.data();
                const userId = userQuiz.userId;
                
                if (!userScores[userId]) {
                    userScores[userId] = {
                        totalScore: 0,
                        totalQuizzes: 0,
                        userId: userId
                    };
                }
                
                userScores[userId].totalScore += userQuiz.score || 0;
                userScores[userId].totalQuizzes += 1;
            });
            
            // Converter objeto em array e ordenar por pontuação
            const ranking = Object.values(userScores).sort((a, b) => b.totalScore - a.totalScore);
            
            // Buscar informações dos usuários
            const userIds = ranking.map(item => item.userId);
            
            if (userIds.length === 0) {
                rankingList.innerHTML = '<div class="card"><div class="card-content">Nenhum resultado disponível no ranking.</div></div>';
                return;
            }
            
            db.collection('users')
                .where(firebase.firestore.FieldPath.documentId(), 'in', userIds.slice(0, 20)) // Limitar a 20 usuários
                .get()
                .then(usersSnapshot => {
                    const usersMap = {};
                    usersSnapshot.forEach(doc => {
                        usersMap[doc.id] = doc.data();
                    });
                    
                    // Exibir ranking
                    rankingList.innerHTML = '';
                    
                    ranking.slice(0, 20).forEach((item, index) => {
                        const user = usersMap[item.userId];
                        if (!user) return;
                        
                        const rankingItem = document.createElement('div');
                        rankingItem.className = 'ranking-item';
                        
                        // Destacar usuário atual
                        if (item.userId === currentUser.uid) {
                            rankingItem.style.background = 'rgba(74, 108, 247, 0.1)';
                            rankingItem.style.borderLeft = '4px solid var(--primary-color)';
                        }
                        
                        rankingItem.innerHTML = `
                            <div class="ranking-position">${index + 1}</div>
                            <div class="ranking-info">
                                <div class="ranking-name">${user.name} ${item.userId === currentUser.uid ? '(Você)' : ''}</div>
                                <div class="ranking-details">${item.totalQuizzes} quiz(s) realizado(s)</div>
                            </div>
                            <div class="ranking-score">${item.totalScore} pts</div>
                        `;
                        
                        rankingList.appendChild(rankingItem);
                    });
                });
        })
        .catch(error => {
            rankingList.innerHTML = '<div class="card"><div class="card-content">Erro ao carregar ranking.</div></div>';
            console.error('Erro ao carregar ranking:', error);
        });
}

// Carregar histórico do usuário
function loadUserHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<div class="card"><div class="card-content">Carregando histórico...</div></div>';
    
    db.collection('userQuizzes')
        .where('userId', '==', currentUser.uid)
        .where('status', '==', 'completed')
        .orderBy('completedAt', 'desc')
        .get()
        .then(querySnapshot => {
            historyList.innerHTML = '';
            
            if (querySnapshot.empty) {
                historyList.innerHTML = '<div class="card"><div class="card-content">Nenhum quiz concluído ainda.</div></div>';
                return;
            }
            
            // Buscar informações dos quizzes
            const quizIds = [];
            const userQuizzesMap = {};
            
            querySnapshot.forEach(doc => {
                const userQuiz = { id: doc.id, ...doc.data() };
                quizIds.push(userQuiz.quizId);
                userQuizzesMap[userQuiz.quizId] = userQuiz;
            });
            
            db.collection('quizzes')
                .where(firebase.firestore.FieldPath.documentId(), 'in', quizIds)
                .get()
                .then(quizzesSnapshot => {
                    const quizzesMap = {};
                    quizzesSnapshot.forEach(doc => {
                        quizzesMap[doc.id] = doc.data();
                    });
                    
                    quizIds.forEach(quizId => {
                        const quiz = quizzesMap[quizId];
                        const userQuiz = userQuizzesMap[quizId];
                        
                        if (quiz && userQuiz) {
                            const historyCard = document.createElement('div');
                            historyCard.className = 'card';
                            
                            historyCard.innerHTML = `
                                <div class="card-header">
                                    <h3 class="card-title">${quiz.title}</h3>
                                    <span class="card-badge">${userQuiz.percentage.toFixed(1)}%</span>
                                </div>
                                <div class="card-content">
                                    <p>${quiz.description || 'Sem descrição'}</p>
                                    <p><strong>Pontuação:</strong> ${userQuiz.score}/${quiz.questionsCount}</p>
                                    <p><strong>Concluído em:</strong> ${userQuiz.completedAt.toDate().toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div class="card-actions">
                                    <button class="btn btn-primary" data-quiz-id="${quizId}">
                                        <i class="fas fa-chart-bar"></i>
                                        <span class="btn-text">Ver Detalhes</span>
                                    </button>
                                </div>
                            `;
                            
                            const button = historyCard.querySelector('button');
                            button.addEventListener('click', () => {
                                showQuizResult(quizId);
                            });
                            
                            historyList.appendChild(historyCard);
                        }
                    });
                });
        })
        .catch(error => {
            historyList.innerHTML = '<div class="card"><div class="card-content">Erro ao carregar histórico.</div></div>';
            console.error('Erro ao carregar histórico:', error);
        });
}
