document.addEventListener("DOMContentLoaded", function () {
    let currentQuestionIndex = 0;
    let quizData = [];
    let timer;
    let rightAnswers = 0;
    let wrongAnswers = 0;
    let skippedQuestions = 0;
    let table = "";
    let time = 3000;

    const quizContainer = document.getElementById('quiz');
    const nextButton = document.getElementById('next');
    const skipButton = document.getElementById('skip');
    const finalSubmit = document.getElementById('finalSubmit');
    const timerClock = document.getElementById('timer')
    const allButtons = document.getElementById('button')
    const countdownDiv = document.getElementsByClassName('countdown')

    fetch('quiz.json')
        .then(response => response.json())
        .then(data => {
            quizData = data["quiz"];
            showQuestion(currentQuestionIndex);
        })
        .catch(error => console.error('Error loading quiz:', error));

    function showQuestion(index) {

        clearTimeout(timer);

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
            });
        });

        countdown = time / 1000;
        timerClock.textContent = `${countdown} Seconds`;

        countdownInterval = setInterval(() => {
            countdown--;
            timerClock.textContent = `${countdown} Seconds`;
            if (countdown < 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);
        timer = setTimeout(() => {
            logAnswerAndNext();
        }, time);


    }

    function logAnswerAndNext() {
        clearTimeout(timer);
        clearInterval(countdownInterval);
        
        const answer = quizData[currentQuestionIndex].answer;
        const selected = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
        let selectedValue;
        if (selected) {
            selectedValue = selected.value;
            if (quizData[currentQuestionIndex].options[selectedValue] === answer) {
                rightAnswers++;
                console.log(`Question ${currentQuestionIndex + 1}: Correct Answer - ${quizData[currentQuestionIndex].options[selectedValue]}`);
            } else {
                wrongAnswers++;
                console.log(`Question ${currentQuestionIndex + 1}: Wrong Answer - ${quizData[currentQuestionIndex].options[selectedValue]}, Correct Answer - ${answer}`);
            }
            console.log(`Question ${currentQuestionIndex + 1}: Selected Option - ${quizData[currentQuestionIndex].options[selectedValue]}`);
        } else {
            console.log(`Question ${currentQuestionIndex + 1}: No option selected`);
            skippedQuestions++;
        }
        table += `<div>
                <p>Question ${currentQuestionIndex + 1} : ${quizData[currentQuestionIndex].question}</p>
                <p>Options:</p>
                ${quizData[currentQuestionIndex].options.map(option => `<p>${option}</p>`).join('')}   
                <p>Correct Answer : ${quizData[currentQuestionIndex].answer}</p>
                <p>Selected Option : ${quizData[currentQuestionIndex].options[selectedValue]}</p>
            </div>`

        currentQuestionIndex++;

        if (currentQuestionIndex < quizData.length) {
            showQuestion(currentQuestionIndex);
        } else {
            quizContainer.innerHTML = "<button id='submit'>Submit Quiz</button>";
            const submitButton = document.getElementById('submit');
            submitButton.addEventListener('click', () => {
                const mainContainer = document.getElementById("main-container")
                mainContainer.innerHTML = table
                clearTimeout(timer);
                alert(`Quiz Completed! Right Answers: ${rightAnswers}, Wrong Answers: ${wrongAnswers}, Skipped Questions: ${skippedQuestions}`);
                console.log(`Total Right Answers: ${rightAnswers}`);
                console.log(`Total Wrong Answers: ${wrongAnswers}`);
                console.log(`Total Skipped Questions: ${skippedQuestions}`);
            });
            nextButton.style.display = 'none';
            skipButton.style.display = 'none';
            finalSubmit.style.display = 'none';
            allButtons.style.display = 'none';
            timerClock.style.display = 'none';
            countdownDiv.style.display = 'none';
        }

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
        logAnswerAndNext();
        const mainContainer = document.getElementById("main-container")
        mainContainer.innerHTML = table
        clearTimeout(timer);
        alert(`Quiz Completed! Right Answers: ${rightAnswers}, Wrong Answers: ${wrongAnswers}, Skipped Questions: ${skippedQuestions}`);
        console.log(`Total Right Answers: ${rightAnswers}`);
        console.log(`Total Wrong Answers: ${wrongAnswers}`);
        console.log(`Total Skipped Questions: ${skippedQuestions}`);
    });

});