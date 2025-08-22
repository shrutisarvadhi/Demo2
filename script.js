let currentQuestionIndex = 0;
let quizData = [];
let timer;
let rightAnswers = 0;
let wrongAnswers = 0;
let skippedQuestions = 0;
let table = "";
let time = 10000;
let countdown, countdownInterval;
let remainingTime = time;
let faceWarnings = 0;
let quizPaused = false;
let faceCheckInterval;

const allQuiz = document.getElementById('ques-time');
const quizContainer = document.getElementById('quiz');
const nextButton = document.getElementById('next');
const skipButton = document.getElementById('skip');
const finalSubmit = document.getElementById('finalSubmit');
const timerClock = document.getElementById('timer');
const allButtons = document.getElementById('button');
const warningDiv = document.getElementById('camera-warning');
const ttsToggleBtn = document.getElementById('tts-toggle');
const trackerContainer = document.getElementById("que-tracker");

let ttsEnabled = false;
const synth = window.speechSynthesis;

ttsToggleBtn.addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    ttsToggleBtn.textContent = ttsEnabled ? "🔇 Disable Voice" : "🔊 Enable Voice";
    if (!ttsEnabled) {
        synth.cancel();
    } else {
        const question = quizData[currentQuestionIndex];
        if (question) {
            let speechText = `Question ${currentQuestionIndex + 1}. ${question.question}. `;
            question.options.forEach((option, i) => {
                speechText += `Option ${i + 1}: ${option}. `;
            });
            speak(speechText);
        }
    }
});

function speak(text) {
    if (!ttsEnabled || !text) return;

    if (synth.speaking) {
        synth.cancel();
        setTimeout(() => {
            actuallySpeak(text);
        }, 250);
    } else {
        actuallySpeak(text);
    }
}

function actuallySpeak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    synth.speak(utterance);
}

function hideCamera() {
    const container = document.getElementById('camera-container');
    if (container) container.style.display = 'none';
    const video = document.getElementById('camera');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    if (faceCheckInterval) clearInterval(faceCheckInterval);
}

function showCamera() {
    const container = document.getElementById('camera-container');
    if (container) container.style.display = 'block';
}

function updateWarningMessage(message) {
    warningDiv.style.display = 'block';
    warningDiv.textContent = `${message} (${faceWarnings}/3 warnings)`;
}

async function startCameraAndDetection() {
    const video = document.getElementById('camera');
    warningDiv.style.display = 'none';
    showCamera();

    await faceapi.nets.tinyFaceDetector.loadFromUri('./models');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play();
    } catch (err) {
        warningDiv.style.display = 'block';
        warningDiv.textContent = 'Cannot access camera!';
        return;
    }

    let previousBox = null;
    let movementThreshold = 0.25;

    faceCheckInterval = setInterval(async () => {
        if (video.readyState >= 2) {
            const detections = await faceapi.detectAllFaces(
                video,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })
            );

            if (detections.length === 0 && !quizPaused) {
                faceWarnings++;
                updateWarningMessage("Face not detected!");
                pauseQuiz();
            } else if (detections.length > 1 && !quizPaused) {
                faceWarnings++;
                updateWarningMessage("Multiple faces detected!");
                pauseQuiz();
            } else if (detections.length === 1) {
                const box = detections[0].box;
                if (previousBox) {
                    const dx = Math.abs(box.x - previousBox.x);
                    const dy = Math.abs(box.y - previousBox.y);
                    const dw = Math.abs(box.width - previousBox.width);
                    const dh = Math.abs(box.height - previousBox.height);
                    const movement = (dx + dy + dw + dh) / (box.width + box.height);
                    if (movement > movementThreshold && !quizPaused) {
                        faceWarnings++;
                        updateWarningMessage("Too much face movement!");
                        pauseQuiz();
                    } else if (quizPaused) {
                        resumeQuiz();
                    }
                }
                previousBox = box;
                if (quizPaused) resumeQuiz();
            }

            if (faceWarnings >= 3) {
                clearInterval(faceCheckInterval);
                submitQuizDueToWarnings();
            }
        }
    }, 1000);
}

function pauseQuiz() {
    quizPaused = true;
    clearTimeout(timer);
    clearInterval(countdownInterval);
    nextButton.disabled = true;
    skipButton.disabled = true;
    finalSubmit.disabled = true;
}

function resumeQuiz() {
    if (!quizPaused) return;
    quizPaused = false;
    nextButton.disabled = false;
    skipButton.disabled = false;
    finalSubmit.disabled = false;

    if (currentQuestionIndex < quizData.length) {
        countdown = remainingTime / 1000;
        timerClock.textContent = `${countdown} Seconds`;
        countdownInterval = setInterval(() => {
            countdown--;
            timerClock.textContent = `${countdown} Seconds`;
            if (countdown <= 0) clearInterval(countdownInterval);
        }, 1000);

        timer = setTimeout(() => logAnswerAndNext(), remainingTime);
    }
}

function submitQuizDueToWarnings() {
    clearTimeout(timer);
    clearInterval(countdownInterval);
    clearInterval(faceCheckInterval);
    quizPaused = true;
    synth.cancel();

    nextButton.disabled = true;
    skipButton.disabled = true;
    finalSubmit.disabled = true;
    warningDiv.textContent = 'Quiz auto-submitted due to 3 face detection warnings.';

    onQuizComplete();
}

function logCurrentAnswer() {
    const question = quizData[currentQuestionIndex];
    const answer = question.answer;
    const selected = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);

    quizData[currentQuestionIndex].selected = !!selected;

    if (selected) {
        const selectedValue = selected.value;
        if (question.options[selectedValue] === answer) {
            rightAnswers++;
        } else {
            wrongAnswers++;
        }
    } else {
        skippedQuestions++;
    }

    const correctAnswer = question.answer;
    const options = question.options;
    let optionsHTML = '';

    options.forEach((option) => {
        let className = 'option-item';
        if (selected) {
            const selectedOptionText = options[selected.value];
            if (selectedOptionText === correctAnswer) {
                if (option === selectedOptionText) className += ' correct-selected';
            } else {
                if (option === selectedOptionText) className += ' wrong-selected';
                else if (option === correctAnswer) className += ' correct-answer';
            }
        } else {
            if (option === correctAnswer) className += ' no-selection';
        }
        optionsHTML += `<p class="${className}">${option}</p>`;
    });

    table += `<div class="question-result">
        <p class="question-text">Question ${currentQuestionIndex + 1}: ${question.question}</p>
        <div class="options-container">${optionsHTML}</div>
    </div>`;
}

fetch('./quiz.json')
    .then(response => response.json())
    .then(data => {
        quizData = data["quiz"];
        showQuestion(currentQuestionIndex);
        startCameraAndDetection();
    })
    .catch(error => console.error('Error loading quiz:', error));

function showQuestion(index) {
    clearTimeout(timer);
    clearInterval(countdownInterval);
    remainingTime = time;
    showCamera();
    updateQuestionTracker();

    const question = quizData[index];
    let output = `<div class="question">${index + 1}. ${question.question}</div>`;

    question.options.forEach((option, i) => {
        output += `
        <div class="option-div">
            <label class="option">
                <input type="radio" name="q${index}" value="${i}" id="id${i}"> ${option}
            </label><br>
        </div>`;
    });

    quizContainer.innerHTML = output;

    nextButton.disabled = true;

    const optionInputs = document.querySelectorAll(`input[name="q${index}"]`);
    optionInputs.forEach(input => {
        input.addEventListener("change", () => {
            nextButton.disabled = false;
            quizData[index].selected = true;
            updateQuestionTracker();
        });
    });

    if (ttsEnabled) {
        let speechText = `Question ${index + 1}. ${question.question}. `;
        question.options.forEach((option, i) => {
            speechText += `Option ${i + 1}: ${option}. `;
        });
        speak(speechText);
    }

    countdown = time / 1000;
    timerClock.textContent = `${countdown} Seconds`;
    countdownInterval = setInterval(() => {
        countdown--;
        timerClock.textContent = `${countdown} Seconds`;
        if (countdown < 0) clearInterval(countdownInterval);
    }, 1000);

    timer = setTimeout(() => logAnswerAndNext(), time);
}

function logAnswerAndNext() {
    clearTimeout(timer);
    clearInterval(countdownInterval);

    const answer = quizData[currentQuestionIndex].answer;
    const selected = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);

    quizData[currentQuestionIndex].selected = !!selected;

    if (selected) {
        const selectedValue = selected.value;
        if (quizData[currentQuestionIndex].options[selectedValue] === answer) {
            rightAnswers++;
        } else {
            wrongAnswers++;
        }
    } else {
        skippedQuestions++;
    }

    const question = quizData[currentQuestionIndex];
    const correctAnswer = question.answer;
    const options = question.options;
    let optionsHTML = '';

    options.forEach((option) => {
        let className = 'option-item';
        if (selected) {
            const selectedOptionText = options[selected.value];
            if (selectedOptionText === correctAnswer) {
                if (option === selectedOptionText) className += ' correct-selected';
            } else {
                if (option === selectedOptionText) className += ' wrong-selected';
                else if (option === correctAnswer) className += ' correct-answer';
            }
        } else {
            if (option === correctAnswer) className += ' no-selection';
        }
        optionsHTML += `<p class="${className}">${option}</p>`;
    });

    table += `<div class="question-result">
        <p class="question-text">Question ${currentQuestionIndex + 1}: ${question.question}</p>
        <div class="options-container">${optionsHTML}</div>
    </div>`;

    currentQuestionIndex++;

    if (currentQuestionIndex < quizData.length) {
        showQuestion(currentQuestionIndex);
    } else {
        onQuizComplete();
    }
}

function updateQuestionTracker() {
    trackerContainer.innerHTML = "";
    quizData.forEach((q, i) => {
        const div = document.createElement("div");
        div.classList.add("question-circle");

        if (i === currentQuestionIndex) {
            div.classList.add("current-question");
        } else if (q.selected === true) {
            div.classList.add("answered-question");
        } else {
            div.classList.add("unanswered-question");
        }

        div.textContent = i + 1;
        trackerContainer.appendChild(div);
    });
}

function processRemainingQuestions() {
    for (let i = currentQuestionIndex; i < quizData.length; i++) {
        const question = quizData[i];
        const correctAnswer = question.answer;
        const options = question.options;

        let optionsHTML = '';
        options.forEach((option) => {
            let className = 'option-item';
            if (option === correctAnswer) {
                className += ' no-selection';
            }
            optionsHTML += `<p class="${className}">${option}</p>`;
        });

        table += `<div class="question-result">
            <p class="question-text">Question ${i + 1}: ${question.question}</p>
            <div class="options-container">${optionsHTML}</div>
        </div>`;

        skippedQuestions++;
    }
}

function onQuizComplete() {
    hideCamera();
    trackerContainer.classList.add('submit-tracker');
    updateQuestionTracker();

    if (currentQuestionIndex < quizData.length) {
        processRemainingQuestions();
    }

    const newButton = document.createElement('button');
    newButton.classList.add('my-button');
    newButton.textContent = 'Submit Quiz';
    newButton.id = 'submit';
    trackerContainer.insertAdjacentElement('afterend', newButton);

    allQuiz.style.display = 'none';
    nextButton.style.display = 'none';
    skipButton.style.display = 'none';
    finalSubmit.style.display = 'none';
    allButtons.style.display = 'none';
    timerClock.style.display = 'none';
    document.querySelector('.countdown').style.display = 'none';

    document.getElementById('submit').addEventListener('click', () => {
        const mainContainer = document.getElementById("main-container");
        const scoreText = `<div class="score-text">Your Score: ${rightAnswers} / ${quizData.length}</div>`;

        if (ttsEnabled) {
            speak(`Quiz completed. Your score is ${rightAnswers} out of ${quizData.length}.`);
        }

        const fullResults = `
            <div id="result-wrapper">
                <div id="result-preview" class="results-preview">
                    <div id="result-pdf">${scoreText}<div class="results-container">${table}</div></div>
                </div>
                <div style="text-align: center;">
                    <button id="confirm-download-btn">Download as PDF</button>
                </div>
            </div>`;

        mainContainer.innerHTML = fullResults;

        document.getElementById('confirm-download-btn').addEventListener('click', () => {
            const element = document.getElementById('result-pdf');
            const wrapper = document.getElementById('result-wrapper');
            const preview = document.getElementById('result-preview');
            const resultContainer = document.querySelector('.results-container');

            const originalStyles = {
                wrapper: { maxHeight: wrapper.style.maxHeight, overflow: wrapper.style.overflow },
                preview: { maxHeight: preview.style.maxHeight, overflow: preview.style.overflow },
                container: { maxHeight: resultContainer.style.maxHeight, overflow: resultContainer.style.overflow }
            };

            wrapper.style.maxHeight = 'none';
            wrapper.style.overflow = 'visible';
            preview.style.maxHeight = 'none';
            preview.style.overflow = 'visible';
            resultContainer.style.maxHeight = 'none';
            resultContainer.style.overflow = 'visible';

            window.scrollTo(0, 0);

            const opt = {
                margin: 0.5,
                filename: `quiz_result.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    scrollY: 0,
                    windowWidth: document.body.scrollWidth,
                    windowHeight: document.body.scrollHeight
                },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(element).save().then(() => {
                Object.assign(wrapper.style, originalStyles.wrapper);
                Object.assign(preview.style, originalStyles.preview);
                Object.assign(resultContainer.style, originalStyles.container);
            });
        });
    });
}

nextButton.addEventListener('click', () => {
    clearTimeout(timer);
    logAnswerAndNext();
});

skipButton.addEventListener('click', () => {
    clearTimeout(timer);
    logAnswerAndNext();
});

finalSubmit.addEventListener('click', () => {
    clearTimeout(timer);
    clearInterval(countdownInterval);

    if (currentQuestionIndex < quizData.length) {
        logCurrentAnswer();
        currentQuestionIndex++;
    }

    onQuizComplete();
});