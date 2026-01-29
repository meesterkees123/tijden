// Game state
let score = 0;
let currentQuestion = null;
let correctAnswers = 0;
let totalQuestions = 0;
let isAnswered = false;

// DOM elements
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const questionText = document.getElementById('question-text');
const answerButtons = document.querySelectorAll('.answer-btn');
const scoreDisplay = document.getElementById('score');
const feedback = document.getElementById('feedback');
const finalScore = document.getElementById('final-score');
const correctCount = document.getElementById('correct-count');
const totalCount = document.getElementById('total-count');
const victoryFloat = document.getElementById('victory-float');

const pointsPerQuestion = 20;

// Zinnen database - wordt geladen uit bestand
let sentences = [];

// Tijdvormen
const timeForms = ['Tegenwoordige tijd', 'Verleden tijd', 'Voltooide tijd'];

// Get random integer between min and max (inclusive)
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Laad zinnen uit een bestand (JSON formaat) of uit ingebedde data
async function loadSentences() {
    // Eerst kijken of zinnen al beschikbaar zijn via zinnen-data.js
    if (typeof ZINNEN_DATA !== 'undefined' && ZINNEN_DATA && ZINNEN_DATA.sentences) {
        console.log('Zinnen gevonden in ZINNEN_DATA');
        const loadedSentences = ZINNEN_DATA.sentences;
        originalSentences = JSON.parse(JSON.stringify(loadedSentences));
        sentences = JSON.parse(JSON.stringify(loadedSentences));
        console.log('Zinnen geladen uit zinnen-data.js:', sentences.length);
        return true;
    }
    
    // Anders proberen via fetch
    try {
        console.log('Proberen zinnen.json te laden via fetch...');
        
        let response;
        try {
            response = await fetch('zinnen.json', {
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/json'
                }
            });
        } catch (fetchError) {
            // Als fetch faalt (bijv. file:// protocol), probeer XMLHttpRequest
            console.log('Fetch faalde, probeer XMLHttpRequest...');
            return await loadSentencesXHR();
        }
        
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('JSON tekst ontvangen, lengte:', text.length);
        
        // Verwijder BOM als die er is
        const cleanedText = text.replace(/^\ufeff/, '');
        
        const data = JSON.parse(cleanedText);
        console.log('JSON geparsed');
        
        const loadedSentences = data.sentences || data; // Ondersteunt beide formaten
        
        if (!Array.isArray(loadedSentences)) {
            throw new Error('Zinnen is geen array');
        }
        
        // Sla de geladen zinnen op in originalSentences voor hergebruik
        originalSentences = JSON.parse(JSON.stringify(loadedSentences));
        sentences = JSON.parse(JSON.stringify(loadedSentences));
        
        console.log('Zinnen succesvol geladen via fetch:', sentences.length);
        return true;
    } catch (error) {
        console.error('Fout bij laden van zinnen:', error);
        console.error('Error details:', error.message);
        
        // Probeer XMLHttpRequest als fallback
        try {
            return await loadSentencesXHR();
        } catch (xhrError) {
            console.error('Ook XHR faalde:', xhrError);
        }
        
        // Fallback naar voorbeeldzinnen als bestand niet bestaat
        const fallbackSentences = [
            { zin: 'Ik loop naar school.', tijd: 'Tegenwoordige tijd' },
            { zin: 'Hij heeft gegeten.', tijd: 'Voltooide tijd' },
            { zin: 'Wij speelden buiten.', tijd: 'Verleden tijd' }
        ];
        originalSentences = JSON.parse(JSON.stringify(fallbackSentences));
        sentences = JSON.parse(JSON.stringify(fallbackSentences));
        console.warn('Gebruik fallback zinnen:', sentences.length);
        return false;
    }
}

// Alternatieve laadmethode met XMLHttpRequest (werkt soms beter met file://)
function loadSentencesXHR() {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'zinnen.json', true);
        xhr.overrideMimeType('application/json');
        
        xhr.onload = function() {
            if (xhr.status === 200 || xhr.status === 0) { // 0 = file:// protocol
                try {
                    const text = xhr.responseText.replace(/^\ufeff/, ''); // Verwijder BOM
                    const data = JSON.parse(text);
                    const loadedSentences = data.sentences || data;
                    
                    if (!Array.isArray(loadedSentences)) {
                        reject(new Error('Zinnen is geen array'));
                        return;
                    }
                    
                    originalSentences = JSON.parse(JSON.stringify(loadedSentences));
                    sentences = JSON.parse(JSON.stringify(loadedSentences));
                    console.log('Zinnen geladen via XHR:', sentences.length);
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error(`XHR error: ${xhr.status}`));
            }
        };
        
        xhr.onerror = function() {
            reject(new Error('XHR network error'));
        };
        
        xhr.send();
    });
}

// Genereer een vraag met een willekeurige zin
function generateQuestion() {
    if (sentences.length === 0) {
        console.error('Geen zinnen beschikbaar');
        return null;
    }
    
    // Kies een willekeurige zin
    const randomIndex = getRandomInt(0, sentences.length - 1);
    const selectedSentence = sentences[randomIndex];
    
    // Verwijder deze zin uit de array zodat deze niet opnieuw wordt gebruikt
    sentences.splice(randomIndex, 1);
    
    // Genereer de drie antwoordopties in vaste volgorde: Tegenwoordige tijd, Verleden tijd, Voltooide tijd
    const answers = [...timeForms];
    
    // Vind de index van het juiste antwoord (geen shuffling meer)
    const correctIndex = answers.indexOf(selectedSentence.tijd);
    
    return {
        question: selectedSentence.zin,
        correctAnswer: selectedSentence.tijd,
        answers: answers,
        correctIndex: correctIndex
    };
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Display question
function displayQuestion() {
    questionCount++;
    
    console.log(`Vraag ${questionCount}, Beschikbare zinnen: ${sentences.length}`);
    
    // End game after 20 questions of als er geen zinnen meer zijn
    if (questionCount > 20) {
        console.log('Spel gestopt: 20 vragen bereikt');
        endGame();
        return;
    }
    
    if (sentences.length === 0) {
        console.log('Spel gestopt: geen zinnen meer beschikbaar');
        endGame();
        return;
    }
    
    currentQuestion = generateQuestion();
    
    if (!currentQuestion) {
        console.log('Spel gestopt: kon geen vraag genereren');
        endGame();
        return;
    }
    
    questionText.textContent = currentQuestion.question;
    
    answerButtons.forEach((btn, index) => {
        btn.textContent = currentQuestion.answers[index];
        btn.classList.remove('correct', 'incorrect', 'disabled');
        btn.disabled = false;
    });
    
    feedback.textContent = '';
    feedback.className = 'feedback';
    isAnswered = false;
}

// Handle answer selection
function handleAnswer(selectedIndex) {
    if (isAnswered) return;
    
    isAnswered = true;
    totalQuestions++;
    
    // Disable all buttons
    answerButtons.forEach(btn => {
        btn.classList.add('disabled');
        btn.disabled = true;
    });
    
    const isCorrect = selectedIndex === currentQuestion.correctIndex;
    
    if (isCorrect) {
        score += pointsPerQuestion;
        correctAnswers++;
        answerButtons[selectedIndex].classList.add('correct');
        feedback.textContent = `Goed gedaan! +${pointsPerQuestion} punten`;
        feedback.className = 'feedback correct';
        scoreDisplay.textContent = score;
    } else {
        answerButtons[selectedIndex].classList.add('incorrect');
        answerButtons[currentQuestion.correctIndex].classList.add('correct');
        feedback.textContent = `Helaas! Het juiste antwoord was: ${currentQuestion.correctAnswer}`;
        feedback.className = 'feedback incorrect';
    }
    
    // Move to next question after 2 seconds
    setTimeout(() => {
        displayQuestion();
    }, 2000);
}

// Start game
async function startGame() {
    // Laad zinnen alleen als ze nog niet geladen zijn
    if (originalSentences.length === 0) {
        await loadSentences();
    }
    
    // Reset de sentences array naar een kopie van alle geladen zinnen
    sentences = JSON.parse(JSON.stringify(originalSentences));
    console.log('Spel gestart met', sentences.length, 'zinnen beschikbaar');
    
    score = 0;
    correctAnswers = 0;
    totalQuestions = 0;
    questionCount = 0;
    scoreDisplay.textContent = score;
    toggleVictory(false);
    
    startScreen.classList.remove('active');
    gameScreen.classList.add('active');
    endScreen.classList.remove('active');
    
    displayQuestion();
}

let originalSentences = [];

function goToStartScreen() {
    toggleVictory(false);
    startScreen.classList.add('active');
    gameScreen.classList.remove('active');
    endScreen.classList.remove('active');
}

// End game
function endGame() {
    gameScreen.classList.remove('active');
    endScreen.classList.add('active');
    
    finalScore.textContent = score;
    correctCount.textContent = correctAnswers;
    totalCount.textContent = totalQuestions;

    toggleVictory(correctAnswers === 20 && totalQuestions === 20);
}

// Laad zinnen bij het laden van de pagina
loadSentences().then(() => {
    console.log('Zinnen geladen bij pageload:', originalSentences.length);
});

// Event listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', goToStartScreen);

answerButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => {
        if (!isAnswered) {
            handleAnswer(index);
        }
    });
});

// Question counter
let questionCount = 0;

function toggleVictory(show) {
    if (!victoryFloat) return;
    if (show) {
        victoryFloat.classList.add('show');
    } else {
        victoryFloat.classList.remove('show');
    }
}

// Prevent zoom on double tap (iOS)
let lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

