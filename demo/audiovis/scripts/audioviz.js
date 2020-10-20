
$(document).ready(function () {
    AudioViz = new AudioViz();
    AudioViz.init();
    AudioViz.createCircles();
    AudioViz.setupAudioProcessing();
    AudioViz.handleDrop();
});

// This is the constructor. It is called in the function above -> new AudioViz()
// This is where you change all settings. Feel free to add new configs down the line as they become available
function AudioViz() {

    //Particle field
    this.SEPARATION = 100;
    this.AMOUNTX = 50;
    this.AMOUNTY = 50;

    // Particles config
    this.particles = new Array();
    this.material = [];

    //Declare gui
    this.gui = new dat.GUI( { width: 350 } )

    //gui options
    this.options = {
        url: 'prototype',
        amp_slider: 1,
        freq_slider: 1,
        volume: 0.5,
        color_picker: '#ffffff',
        opacity_slider: 1,
        disco: false
    };

    // Camera Settings
    this.cameraPosX = 0;
    this.cameraPosY = 0;
    this.cameraPosZ = 1000;
    this.fieldOfView = 75;

    // Light Settings
    this.lightPosX = -100;
    this.lightPosY = 200;
    this.lightPosZ = 100;
    this.lightColor = 0xffffff;
    this.lightIntensity = 0.3;

    // General scene settings
    this.backgroundColor = 0x000000;
    this.antialias = true;
    this.alpha = true;

    // Individual sphere settings
    this.sphereRadius = 0.5;
    this.widthSegments = 8;
    this.heightSegments = 8;

    // Rendering variables
    this.scene;
    this.camera;
    this.renderer;
    this.controls;

    // Audio variables
    this.javascriptNode;
    this.audioContext;
    this.sourceBuffer;
    this.analyser;
};

AudioViz.prototype.init = function () {
    container = document.createElement('div');
    document.body.appendChild(container);

    this.scene = new THREE.Scene();

    // Gets the current width and hight of the active window
    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelRatio = window.devicePixelRatio;

    // We setup the renderer to work on current width and hight - Antialias = true
    // We also attatch the renderer to the DOM
    this.renderer = new THREE.CanvasRenderer({antialias: this.antialias, alpha: this.alpha});
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pixelRatio)
    document.body.appendChild(this.renderer.domElement);

    // Adds a camera so we can actually see anything
    this.camera = new THREE.PerspectiveCamera(this.fieldOfView, width / height, 1, 10000);
    this.camera.position.set(this.cameraPosX, this.cameraPosY, this.cameraPosZ);
    this.scene.add(this.camera);

    // Add scene interaction
    this.controls = new THREE.TrackballControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 5.0;
    this.controls.zoomSpeed = 2.2;
    this.controls.panSpeed = 1;
    this.controls.dynamicDampingFactor = 0.3;

    //FPS GUI
    this.stats = new Stats();
    container.appendChild(this.stats.dom);

    //DAT GUI
    this.gui.add(this.options, "url", 0, 1).name('Song url');
    this.gui.add(this.options, "amp_slider", 0, 1).name('Amp Slider');
    this.gui.add(this.options, "freq_slider", 0, 0.5).name('Frequency Slider');
    this.gui.add(this.options, "volume", 0, 1).name('Volume').onChange(function (value) {
        //sound.setVolume(value);
    });
    this.gui.add(this.options, "color_picker").name('Color Picker').listen();
    this.gui.add(this.options, "disco").name('Disco').listen();
    this.gui.add(this.options, "opacity_slider", 0, 1).name('Opacity Slider').listen();

    // Background color
    this.renderer.setClearColor(this.backgroundColor, 0);

    // Lights
    var light = new THREE.PointLight(this.lightColor, this.lightIntensity);
    light.position.set(this.lightPosX, this.lightPosY, this.lightPosZ)
    this.scene.add(light);

    //on resize
    window.addEventListener('resize', AudioViz.onWindowResize, false);

};

AudioViz.prototype.onWindowResize = function () {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    AudioViz.camera.aspect = window.innerWidth / window.innerHeight;
    AudioViz.camera.updateProjectionMatrix();

    AudioViz.renderer.setSize(window.innerWidth, window.innerHeight);

}

AudioViz.prototype.createCircles = function() {
    var PI2 = Math.PI * 2;

    var i = 0;
    var j = 0;

    for (var ix = 0; ix < AudioViz.AMOUNTX; ix++) {

        for (var iy = 0; iy < AudioViz.AMOUNTY; iy++) {

            AudioViz.material[j] = new THREE.SpriteCanvasMaterial({

                color: 0xffffff,
                program: function (context) {

                    context.beginPath();
                    context.arc(0, 0, 0.5, 0, PI2, true);
                    context.fill();

                }

            });

            particle = AudioViz.particles[i++] = new THREE.Sprite(AudioViz.material[j++]);
            particle.position.x = ix * AudioViz.SEPARATION - ((AudioViz.AMOUNTX * AudioViz.SEPARATION) / 2);
            particle.position.z = iy * AudioViz.SEPARATION - ((AudioViz.AMOUNTY * AudioViz.SEPARATION) / 2);
            AudioViz.scene.add(particle);

        }

    }
};

AudioViz.prototype.setupAudioProcessing = function () {
    //get the audio context
    this.audioContext = new AudioContext();

    //create the javascript node
    this.javascriptNode = this.audioContext.createScriptProcessor(2048, 1, 1);
    this.javascriptNode.connect(this.audioContext.destination);

    //create the source buffer
    this.sourceBuffer = this.audioContext.createBufferSource();

    //create the analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.smoothingTimeConstant = 0.3;
    this.analyser.fftSize = 512;

    //connect source to analyser
    this.sourceBuffer.connect(this.analyser);

    //analyser to speakers
    this.analyser.connect(this.javascriptNode);

    //connect source to analyser
    this.sourceBuffer.connect(this.audioContext.destination);

    var that = this;

    //this is where we animates the bars
    this.javascriptNode.onaudioprocess = function () {

        // get the average for the first channel
        var array = new Uint8Array(that.analyser.frequencyBinCount);
        that.analyser.getByteFrequencyData(array);

        //render the scene and update controls and FPS counter
        AudioViz.renderer.render(AudioViz.scene, AudioViz.camera);
        AudioViz.controls.update();
        AudioViz.stats.update();

        var step = Math.round(array.length / AudioViz.numCircles);

        //Iterate through the bars and scale the z axis
        for (let i = 0; i < AudioViz.numCircles; i++) {
            let value = array[i * step] / 4;
            value = value < 1 ? 1 : value;
            AudioViz.circles[i].scale.z = value;
            console.log(value + " and i= " + i)
        }
    }

};

//start the audio processing
AudioViz.prototype.start = function (buffer) {
    this.audioContext.decodeAudioData(buffer, decodeAudioDataSuccess, decodeAudioDataFailed);
    var that = this;

    function decodeAudioDataSuccess(decodedBuffer) {
        that.sourceBuffer.buffer = decodedBuffer
        that.sourceBuffer.start(0);
    }

    function decodeAudioDataFailed() {
        debugger
    }
};

//set Particle color
function particleColor(color_val, arr[]) {
    color_val = color_val.replace('#', '0x');

    var i = 0;
    for (var ix = 0; ix < AMOUNTX; ix++) {
        for (var iy = 0; iy < AMOUNTY; iy++) {

            var amp = analyser.data[iy];

            particle = particles[i++];
            particle.material.color.setHex(color_val)
            particle.material.opacity = amp;
        }
    }
}

//Set variating particle color
function particleDisco() {
    var i = 0;
    for (var ix = 0; ix < AMOUNTX; ix++) {
        for (var iy = 0; iy < AMOUNTY; iy++) {

            var ampOpa = analyser.data[iy];
            var ampCol = analyser.data[iy] / (fftSize);

            particle = particles[i++];
            particle.material.color.setHex(ampCol * 0xffffff);
            particle.material.opacity = ampOpa;
        }
    }
}

AudioViz.prototype.handleDrop = function () {
    //drag Enter
    document.body.addEventListener("dragenter", function () {
       
    }, false);

    //drag over
    document.body.addEventListener("dragover", function (e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, false);

    //drag leave
    document.body.addEventListener("dragleave", function () {
       
    }, false);

    //drop
    document.body.addEventListener("drop", function (e) {
        e.stopPropagation();

        e.preventDefault();

        //get the file
        var file = e.dataTransfer.files[0];
        var fileName = file.name;

        $("#guide").text("Playing " + fileName);

        var fileReader = new FileReader();

        fileReader.onload = function (e) {
            var fileResult = e.target.result;
            AudioViz.start(fileResult);
        };

        fileReader.onerror = function (e) {
          debugger
        };
       
        fileReader.readAsArrayBuffer(file);
    }, false);
}


