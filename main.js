// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import "@babel/polyfill";
import * as mobilenetModule from '@tensorflow-models/mobilenet';
import * as tf from '@tensorflow/tfjs';
import * as knnClassifier from '@tensorflow-models/knn-classifier';

// Number of classes to classify
const NUM_CLASSES = 3;
// Webcam Image size. Must be 227. 
//const IMAGE_SIZE = 227;
const IMAGE_SIZE_WIDTH = 640;
const IMAGE_SIZE_HEIGHT = 480;
var video_width = IMAGE_SIZE_WIDTH

const VIDEO_MODE = 'user';//'environment';//or 'user'
// K value for KNN
const TOPK = 10;


class Main {
  constructor() {
    // Initiate variables
    this.infoTexts = [];
    this.predictions = [];
    this.training = -1; // -1 when no class is being trained
    this.videoPlaying = false;

    this.videoMode = VIDEO_MODE;

    // Initiate deeplearn.js math and knn classifier objects
    this.bindPage();

    const divWrapper = document.createElement('div');
    divWrapper.classList.add("wrapperDiv")
    document.body.appendChild(divWrapper);

    this.divMain = document.createElement('div');
    this.divMain.classList.add("mainDiv")
    divWrapper.appendChild(this.divMain);
    video_width = window.innerWidth//divMain.offsetWidth

    // Create video element that will contain the webcam image
    this.video = document.createElement('video');
    this.video.setAttribute('autoplay', '');
    this.video.setAttribute('playsinline', '');

    // Add video element to DOM
    this.divMain.appendChild(this.video);

    // Create toggle video_mode button
    const rotateCamera = document.createElement('img')
    rotateCamera.src = 'rotate.png'
    rotateCamera.classList.add('rotateCamera')
    this.divMain.appendChild(rotateCamera);

    // Create training buttons and info texts    
    for (let i = 0; i < NUM_CLASSES; i++) {
      this.createClassDiv(i)
    }

    const divClassWrapper = document.createElement('div');
    divClassWrapper.classList.add("classAddWrapperDiv")
    divWrapper.appendChild(divClassWrapper);
    const buttonAddClass = document.createElement('button')
    //buttonAddClass.innerText = "Add a class";
    buttonAddClass.classList.add('addClass')

    const text1 = document.createElement('span')
    text1.innerText = "+";
    text1.classList.add("addClassPlus")
    buttonAddClass.appendChild(text1);
    const text2 = document.createElement('span')
    text2.innerText = "Add a class";
    buttonAddClass.appendChild(text2);

    //button.style.cssText = "padding-left: 50px;";
    buttonAddClass.addEventListener('touchstart', this.addClassEvent.bind(this));
    divClassWrapper.appendChild(buttonAddClass);

    const buttonSave = document.createElement('button')
    buttonSave.innerText = "Save model";
    buttonSave.classList.add('save')
    buttonSave.addEventListener('touchstart', this.saveModel.bind(this));
    divClassWrapper.appendChild(buttonSave);

    // Listen for mouse events when clicking the button
    rotateCamera.addEventListener('touchstart', (event) => {
      if (this.videoMode == 'environment') {
        this.videoMode = 'user';
      } else {
        this.videoMode = 'environment';
      }
      this.stop()
      this.startStream()
    });


    // Setup webcam
    //navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    this.startStream()
  }

  addClassEvent() {
    let els = document.body.getElementsByClassName('className')//.getAttribute('data-id')
    this.createClassDiv(els.length)
  }

  async saveModel() {
    const hidden = document.body.getElementsByClassName('classInfo hidden')
    if (hidden.length > 0)
      return
    //console.log(this.mobilenet)
    //console.log(this.knn)
    await this.mobilenet.model.save('downloads://my-model');
  }

  createClassDiv(i) {
    const divClassWrapper = document.createElement('div');
    divClassWrapper.classList.add("classWrapperDiv")
    this.divMain.appendChild(divClassWrapper);
    const div = document.createElement('div');
    divClassWrapper.appendChild(div);
    div.classList.add("classDiv");
    div.setAttribute('data-id', i);
    //div.style.marginBottom = '10px';
    const className = document.createElement('span')
    className.innerText = "Class " + i;
    className.classList.add("className")
    div.appendChild(className);

    const editPencil = document.createElement('img')
    editPencil.src = 'pencil.png'
    editPencil.classList.add('editPencil')
    editPencil.addEventListener('touchstart', function (event) {
      let el = this.parentElement.getElementsByClassName('className')//.getAttribute('data-id')
      let t = el[0].textContent
      let newT = prompt('Enter new Class name', t)
      if (newT) {
        el[0].textContent = newT.trim()
      }
    });
    div.appendChild(editPencil);

    // Create info text
    const infoText = document.createElement('span')
    infoText.innerText = "";
    infoText.classList.add("classInfo")
    infoText.classList.add("hidden")
    div.appendChild(infoText);
    this.infoTexts.push(infoText);

    const infoPrediction = document.createElement('span')
    infoPrediction.innerText = "";
    infoPrediction.classList.add("classPrediction")
    infoPrediction.classList.add("hidden")
    div.appendChild(infoPrediction);
    this.predictions.push(infoPrediction);

    // Create training button
    const button = document.createElement('button')
    //button.innerText = "·";
    //button.style.cssText = "padding-left: 50px;";
    div.appendChild(button);

    // Listen for mouse events when clicking the button
    button.addEventListener('touchstart', (event) => {
      this.training = i
    });
    //button.addEventListener('mouseup', (event) => this.training = -1);
    button.addEventListener('touchstart', (event) => {//touchstart
      event.currentTarget.classList.add('pressed')
      this.training = i
    });
    button.addEventListener('touchend', (event) => {
      event.currentTarget.classList.remove('pressed')
      this.training = -1
    });
    button.addEventListener('touchcancel', (event) => {
      event.currentTarget.classList.remove('pressed')
      this.training = -1
    });
  }

  startStream() {
    navigator.mediaDevices.getUserMedia({
      video: {
        width: {
          min: IMAGE_SIZE_WIDTH,
        },
        height: {
          min: IMAGE_SIZE_HEIGHT,
        },
        facingMode: this.videoMode
      }, audio: false
    })
      .then((stream) => {
        let { width, height } = stream.getTracks()[0].getSettings();
        console.log(width, height)
        this.video.srcObject = stream;
        this.video.width = video_width > 600 ? 590 : video_width - 10 //IMAGE_SIZE_WIDTH;
        this.video.height = height * this.video.width / width//IMAGE_SIZE_WIDTH>video_width ? IMAGE_SIZE_HEIGHT * video_width/IMAGE_SIZE_WIDTH : IMAGE_SIZE_HEIGHT;

        this.video.addEventListener('playing', () => this.videoPlaying = true);
        this.video.addEventListener('paused', () => this.videoPlaying = false);
        this.start()
      })
  }

  async bindPage() {
    this.knn = knnClassifier.create();
    this.mobilenet = await mobilenetModule.load();

    //this.start();
  }

  start() {
    if (this.timer) {
      this.stop();
    }
    this.video.play();
    this.timer = requestAnimationFrame(this.animate.bind(this));
  }

  stop() {
    this.video.pause();
    cancelAnimationFrame(this.timer);
  }

  async animate() {
    let a
    if (this.videoPlaying) {
      // Get image data from video element
      const image = tf.fromPixels(this.video);

      let logits;
      // 'conv_preds' is the logits activation of MobileNet.
      if (this.mobilenet) {
        const infer = () => this.mobilenet.infer(image, 'conv_preds');

        // Train class if one of the buttons is held down
        if (this.training != -1) {
          //console.log(this)
          logits = infer();
          //document.body.getElementsByClassName('addClass')[0].textContent = this.training
          // Add current image to classifier
          this.knn.addExample(logits, this.training)
        }

        const numClasses = this.knn.getNumClasses();
        if (numClasses > 0) {

          // If classes have been added run predict
          logits = infer();
          const res = await this.knn.predictClass(logits, TOPK);
          //console.log(res)
          //a = 1

          let nc = document.body.getElementsByClassName('className')
          for (let i = 0; i < nc.length/*NUM_CLASSES*/; i++) {

            // The number of examples for each class
            const exampleCount = this.knn.getClassExampleCount();

            // Make the predicted class bold
            if (res.classIndex == i) {
              this.infoTexts[i].style.fontWeight = 'bold';
            } else {
              this.infoTexts[i].style.fontWeight = 'normal';
            }

            // Update info text
            if (exampleCount[i] > 0) {
              if (!res.confidences[i]) res.confidences[i] = 0
              res.confidences[i] = Math.trunc(res.confidences[i] * 100)
              this.infoTexts[i].innerText = ` ${exampleCount[i]} image samples`
              this.infoTexts[i].classList.remove('hidden')
              this.predictions[i].innerText = `${res.confidences[i]}%`
              this.predictions[i].classList.remove('hidden')
            }
          }
        }

        // Dispose image when done
        image.dispose();
        if (logits != null) {
          logits.dispose();
        }
      }

    }
    if (!a)
      this.timer = requestAnimationFrame(this.animate.bind(this));
  }
}

window.addEventListener('load', () => new Main());
