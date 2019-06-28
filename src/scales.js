
// track screen dimensions
let width = window.innerWidth;
let height = window.innerHeight;

// basic THREE.js objects
let scene, camera, renderer;
let masterGroup, keyboardGroup;
let carouselRadius;
let dataLength;
let categorySet;
let noteRadius;

// required for interactivity
let raycaster;
let highlights = [], activeHighlight = null;
let panels = [], activePanel = null;
let mouse = new THREE.Vector2();
let pitchshift = 0;
let scaleshift = 0;
let noteLabelType = 'flat';
let noteLabels = {
    sharp: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    flat: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
    elements: []
};
let pageElements = {
    name: null,
    category: null,
    description: null
}

// colors
let green = '#00e19e';
let gold = '#ffd830';
let grey = '#666666';

// required for animation
let tweens = new Set([]);
let carouselRot = {amount: 0};
let flagUpdate = true;

// required for audio
let audioCtx;
let audioBuffers = [];

init();
loadAudio();
loadData('./scales.json', (data) => {
    visualize(data).then(() => {
        console.log(scene);
    });
});
initDocument();

function initDocument() {

    window.addEventListener('resize', resize, false);
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('mousedown', onMouseDown);

    document.onkeydown = (e) => {
    
        e = e || window.event;

        if (e.keyCode == '37') {
            rotateCarousel('left');
        }
        else if (e.keyCode == '39') {
            rotateCarousel('right');
        }
    
    }

    document.getElementById('flat').onclick = () => {
        if(noteLabelType != 'flat') {
            noteLabelType = 'flat';
            createLabels(carouselRadius, pitchshift);
        }
    }

    document.getElementById('sharp').onclick = () => {
        if(noteLabelType != 'sharp') {
            noteLabelType = 'sharp';
            createLabels(carouselRadius, pitchshift);
        }
    }

    document.getElementById('increase-root').onclick = () => {
        changePitch(1);
    }

    document.getElementById('decrease-root').onclick = () => {
        changePitch(-1);
    }

    document.getElementById('name').style.color = green;

}

function init() {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1f262f);

    const DPR = (window.devicePixelRatio) ? window.devicePixelRatio : 1;
    renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setPixelRatio(DPR);
    renderer.setSize(width, height);
    document.getElementById('canvas').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // @TODO: make the radius responsive to the number of scales in the data
    carouselRadius = 70;

    let aspect = width/height;
    camera = new THREE.PerspectiveCamera(60, aspect, 1, carouselRadius/2);
    camera.position.set(0, 0, carouselRadius * 1.2);
    camera.updateMatrixWorld();

    raycaster = new THREE.Raycaster();
    AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    masterGroup = new THREE.Group();

}

function loadData(src, callback){
    $.getJSON(src, (data) => {
        dataLength = data.length;
        scene.userData.data = data;
        callback(data);
    });
}

function loadAudio(){
    for(let i = 0; i < 23; i++) {
        let url = `./audio/marimba/${i+1}.mp3`;
        let request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onload = () => {
            audioCtx.decodeAudioData(request.response, function(buffer) {
                audioBuffers[i] = buffer;
            }, (err) => {
                console.error(err);
            });
          }
        request.send();
    }
}

function animate(time){
    window.requestAnimationFrame(animate);
    render(time);
}

function render(time){

    tweens.forEach((t) => {
        t.update(time);
    })

    masterGroup.rotation.y = carouselRot.amount;

    raycaster.setFromCamera(mouse, camera);

    // note interactivity

    let intersects = raycaster.intersectObjects(highlights);

    if(intersects.length > 0) {
        let obj = intersects[0].object;
        if(activeHighlight != obj) { // indicates a new highlight
            activeHighlight = obj;
            playNote(obj, pitchshift);
        }
        activeHighlight = obj;
    } else {
        if(activeHighlight){
            activeHighlight.material.opacity = 0.0;
            activeHighlight = null;
        }
    }

    // panel interactivity

    let intersectsPanels = raycaster.intersectObjects(panels);

    if(intersectsPanels.length > 0) {
        let obj = intersectsPanels[0].object;
        if(activePanel != obj) { // indicates a new highlight
            activePanel = obj;
        }
        activePanel = obj;
        obj.material.opacity = 0.1;    
    } else {
        if(activePanel){
            activePanel.material.opacity = 0.0;
            activePanel = null;
        }
    }

    renderer.render(scene, camera);

}

function visualize(data){
    return new Promise((resolve, reject) => {
        try {
                
            let size = .7;
            let distance = 4;
            let thickness = 0.05

            noteRadius = distance;

            // create labels
            createLabels(distance, pitchshift);

            let categoryList = [];

            // cycle through all scales in 'data'
            for(let i = 0; i < data.length; i++) {

                let scaleGroup = new THREE.Group();
                
                // cycle through all notes in an octave (1-12) and mark
                // whether or not (T/F) they are in the scale
                let notes = [];
                let intervals = data[i].intervals;
                for(let j = 0; j < intervals.length; j++) {
                    // root is always in scale
                    if(j === 0){notes.push(true);}
                    // push intervals[j] - 1 false entries
                    for(let k = 0; k < intervals[j] - 1; k++){notes.push(false);}
                    // add a true for the next note in the scale
                    notes.push(true);
                }
                
                // the final interval duplicates the root note; remove it
                notes.pop();
                
                createRings(notes, scaleGroup, size, distance, thickness);
                createPaths(intervals, scaleGroup, size, distance);
                
                // find coordinates for scaleGroup according to its index
                let s = new THREE.Spherical(carouselRadius, -Math.PI/2, Math.PI + i * (2 * Math.PI / data.length));
                let v = new THREE.Vector3().setFromSpherical(s);
                
                // rotate it to its position on the carousel
                scaleGroup.rotateY(Math.PI * 2 * (i/data.length));
                scaleGroup.position.copy(v);
                
                // add user data
                scaleGroup.userData.notes = notes;
                scaleGroup.userData.index = i;
                scaleGroup.userData.name = data[i].name;
                scaleGroup.userData.category = data[i].category;

                categoryList.push(data[i].category);
                
                // add to master group
                masterGroup.add(scaleGroup);

            }

            // create navigation panels
            createPanels(distance);

            // update the note labels
            updateLabels(masterGroup.children[scaleshift].userData.notes, false);

            // set up initial keyboard display
            displayKeyboard();

            // find unique categories and update the categoryCount
            categorySet = new Set(categoryList);

            scene.add(masterGroup);

            resolve();
  
        } catch (error) {
            reject(error);
        }
    });
}

function createRings(notes, group, size, distance, thickness){

    for(let i = 0; i < notes.length; i++) {

        let geo = new THREE.RingBufferGeometry(size * (1-thickness), size, 64);
        let mat = new THREE.MeshBasicMaterial({color: new THREE.Color(grey), transparent: true, opacity: 1, wireframe: false});
        let mesh = new THREE.Mesh(geo, mat);

        mesh.rotateZ(getRotation(i));
        mesh.translateY(distance);

        if(notes[i]) {
            if(i === 0){
                // if this is the root note, change it to gold
                mat.color = new THREE.Color(gold);
            } else {
                // otherwise, it is in the scale but not the root: change to green
                mat.color = new THREE.Color(green);
            }

            // add a highlight that will be triggered by mousover
            let highlightGeo = new THREE.CircleBufferGeometry(size*(1-thickness), 64);
            let highlightMat = new THREE.MeshBasicMaterial({color: new THREE.Color(0xffffff), transparent: true, opacity: 0.0, wireframe: false});
            highlight = new THREE.Mesh(highlightGeo, highlightMat);
            highlight.position.copy(mesh.position);
            highlight.userData.note = i;
            highlight.userData.ring = mesh;

            // add a highlight that will be visible and move with the ring
            visHighlight = highlight.clone();
            visHighlight.material = highlightMat.clone();
            visHighlight.material.opacity = 0.05;

            let ringGroup = new THREE.Group();
            ringGroup.add(mesh, visHighlight);

            highlights.push(highlight);
            group.add(highlight);
            group.add(ringGroup);

        } else {
            group.add(mesh);
        }
    }
}

function changePitch(n) {

    pitchshift + n < 0 ? 0 : pitchshift + n > 11 ? 11 : pitchshift += n;

    if(pitchshift <= 1 || pitchshift >= 10) {
        switch(pitchshift){
            case 0: 
                document.getElementById('decrease-root').style.color = '#ffffff'; break;
            case 1:
                document.getElementById('decrease-root').style.color = '#ff4c7a'; break;
            case 11: 
                document.getElementById('increase-root').style.color = '#ffffff'; break;
            case 10:
                document.getElementById('increase-root').style.color = '#ff4c7a'; break;
            default: break;
        }
    }

    createLabels(carouselRadius, pitchshift);
    displayKeyboard();
    
}

function createLabels(distance, pitchshift) {

        for(let i = 0 + pitchshift; i < 12 + pitchshift; i++){

            // no need to recreate note labels entirely each time this is called
            if(noteLabels.elements.length != 12) {

                let dummy = new THREE.Mesh();
                dummy.rotateZ(getRotation(i - pitchshift));
                dummy.translateY(distance);
                dummy.translateZ(carouselRadius);

                let meshScreenPos = screenPosition(dummy, camera);

                let noteLabel = document.createElement('div');
                    noteLabel.innerHTML = noteLabels[noteLabelType][i%12];
                    noteLabel.style.position = 'absolute';
                    noteLabel.classList.add('note');
                    document.body.appendChild(noteLabel);
                    noteLabel.style.left = meshScreenPos.x - noteLabel.clientWidth / 2 + 'px';
                    noteLabel.style.top = meshScreenPos.y - noteLabel.clientHeight / 2 + 'px';
                    noteLabels.elements.push(noteLabel);

            } else {
                let noteLabel = noteLabels.elements[i - pitchshift];

                let priors = {
                    width: noteLabel.clientWidth,
                    height: noteLabel.clientHeight,
                    left: parseFloat(noteLabel.style.left.slice(0, -2)),
                    top: parseFloat(noteLabel.style.top.slice(0, -2))
                }
                
                noteLabel.innerHTML = noteLabels[noteLabelType][i%12];

                noteLabel.style.left = priors.left + (priors.width - noteLabel.clientWidth)/2 + 'px';
                noteLabel.style.top = priors.top + (priors.height - noteLabel.clientHeight)/2 + 'px';
            }


        }

    if(noteLabelType == 'sharp') {
        document.getElementById('sharp').style.textDecoration = 'underline';
        document.getElementById('flat').style.textDecoration = 'none';
    } else if(noteLabelType == 'flat') {
        document.getElementById('flat').style.textDecoration = 'underline';
        document.getElementById('sharp').style.textDecoration = 'none';
    }

}

function updateLabels(notes, timeout) {

    let t = timeout ? 300 : 0;

    // timeout allows the carousel to move before updating labels
    window.setTimeout(() => {    
        // update the title, category, and description
        let data = masterGroup.children[scaleshift].userData;

        let noteCount = data.notes.filter((e) => {return e==true;}).length;

        document.getElementById('name').innerText = data.name + ` (${noteCount})`;
        document.getElementById('category').innerText = data.category;
        document.getElementById('category').style.color = '#ff4c7a';

        for(let i = 0; i < noteLabels.elements.length; i++) {
            if(!notes[i]) {
                // set notes outside of scale to grey
                noteLabels.elements[i].style.color = '#444444';
            } else{
                // set notes in scale to white
                noteLabels.elements[i].style.color = '#FFFFFF';

            }
        }

        let oldLables = Array.from(document.getElementsByClassName('interval-label'));

        // clear out old interval labels
        for(let j = 0; j < oldLables.length; j++) {
            oldLables[j].remove();
        }

        // add new interval labels
        for(let k = 0; k < data.intervals.length; k++) {

            let intScreenPos = screenPosition(data.intervals[k].mesh, camera);

            let intElement = document.createElement('div');
                intElement.classList.add(`interval-label`);
                intElement.style.position = 'absolute';
                intElement.innerText = data.intervals[k].interval;
                document.body.appendChild(intElement);
                intElement.style.left = intScreenPos.x - intElement.clientWidth / 2 + 'px';
                intElement.style.top = intScreenPos.y - intElement.clientHeight / 2 + 'px';
        }

    }, t)
}

function updateLabelPositions() {

    // update each note label

    for(let i = 0; i < 12; i++){

        let dummy = new THREE.Mesh();
        dummy.rotateZ(getRotation(i));
        dummy.translateY(noteRadius);
        dummy.translateZ(carouselRadius);

        let meshScreenPos = screenPosition(dummy, camera);

        noteLabel = noteLabels.elements[i];

        noteLabel.style.left = meshScreenPos.x - noteLabel.clientWidth / 2 + 'px';
        noteLabel.style.top = meshScreenPos.y - noteLabel.clientHeight / 2 + 'px';

    }

    // update each interval label

    let intervals = masterGroup.children[scaleshift].userData.intervals;
    let intervalLabels = Array.from(document.getElementsByClassName('interval-label'));

    for(let j = 0; j < intervals.length; j++) {

        let dummy = intervals[j].mesh;
        let labelElement = intervalLabels[j];
        let meshScreenPos = screenPosition(dummy, camera);

        labelElement.style.left = meshScreenPos.x - labelElement.clientWidth / 2 + 'px';
        labelElement.style.top = meshScreenPos.y - labelElement.clientHeight / 2 + 'px';

    }

}

function createPaths(intervals, group, size, distance){

    let noteCounter = 0;
    group.userData.intervals = [];

    for(let i = 0; i < intervals.length; i++) {

        let start = noteCounter;
        let end = noteCounter + intervals[i];
        let minRadius = distance - size;
        let maxRadius = minRadius - intervals[i] * distance / 3.5;

        let s1 = new THREE.Spherical(minRadius, getRotation(start), - Math.PI / 2);
        let s2 = new THREE.Spherical(maxRadius, (getRotation(start)+getRotation(end))/2, - Math.PI / 2);
        let s3 = new THREE.Spherical(minRadius, getRotation(end), - Math.PI / 2);
        
        let sLabel = new THREE.Spherical(minRadius - intervals[i]*0.85, (getRotation(start)+getRotation(end))/2, - Math.PI / 2);

        let v1 = new THREE.Vector3().setFromSpherical(s1);
        let v2 = new THREE.Vector3().setFromSpherical(s2);
        let v3 = new THREE.Vector3().setFromSpherical(s3);

        let vLabel = new THREE.Vector3().setFromSpherical(sLabel);
        
        let c = createCurve(
            new THREE.Vector2(v1.x, v1.y),
            new THREE.Vector2(v2.x, v2.y),
            new THREE.Vector2(v3.x, v3.y)
        );

        let dummy = new THREE.Mesh();
        dummy.position.copy(vLabel);
        dummy.translateZ(carouselRadius);
 
        // This just honestly doesn't look as good:

        // let intervalText;
        // switch(intervals[i]){
        //     case 1:
        //         intervalText = 'm2'; break;
        //     case 2:
        //         intervalText = 'M2'; break;
        //     case 3:
        //         intervalText = 'm3'; break;
        //     case 4:
        //         intervalText = 'M3'; break;
        //     case 5:
        //         intervalText = 'P4'; break;
        // }

        group.userData.intervals.push({
            mesh: dummy,
            interval: intervals[i]
        })

        group.add(c);

        noteCounter += intervals[i];

    }

}

function createPanels(distance){
    // add a backgroup for the scale group
    let backW = distance * 4.5;
    let backH = distance * 3;
    let backGeo = new THREE.PlaneBufferGeometry(backW, backH);
    let backMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.0});
    let backMesh = new THREE.Mesh(backGeo, backMat);
    backMesh.position.copy(camera.position.clone().multiplyScalar(0.8));
    backMesh.updateMatrix();

    // add left and right panels for navigation
    let backR = backMesh.clone();
    let backL = backMesh.clone();

    // clone material too
    backR.material = backMat.clone();
    backL.material = backMat.clone();

    // scale and position panels
    let scale = 0.1;
    backR.scale.set(scale, 1, 1);
    backL.scale.set(scale, 1, 1);
    backR.translateX(backW/2 - backW * scale / 2);
    backL.translateX(-backW/2 + backW * scale / 2);
    
    // add an indicator for left/right
    backR.userData.direction = 'right';
    backL.userData.direction = 'left';

    panels.push(backR);
    panels.push(backL);
    scene.add(backR);
    scene.add(backL);

    // create arrow icons
    let aGeo = new THREE.BufferGeometry();
    let posAttr = new Float32Array(9);
    posAttr.set([0,-1,0,1,0,0,0,1,0]);
    aGeo.addAttribute('position', new THREE.BufferAttribute(posAttr, 3));
    aGeo.computeVertexNormals();
    aMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide});
    aMesh = new THREE.Mesh(aGeo, aMat);
    aMesh.position.copy(camera.position.clone().multiplyScalar(0.8));

    let rMesh = aMesh.clone();
    let lMesh = aMesh.clone();

    rMesh.translateX(backW/2 - 0.5 - backW * scale / 2);
    lMesh.rotateY(Math.PI);
    lMesh.translateX(backW/2 - 0.5 - backW * scale / 2);

    scene.add(rMesh);
    scene.add(lMesh);

}

function createCurve(s, m, e){
    let p = 30;
    
    let points = new THREE.QuadraticBezierCurve(s, m, e).getPoints(p);
    let geo = new THREE.BufferGeometry();
    let pos = [];
    let posAttr = new Float32Array((p+1)*3);
    
    for (let i = 0; i <= p; i++){
        pos.push(points[i].x);
        pos.push(points[i].y);
        pos.push(0);
    }
    
    posAttr.set(pos);
    
    geo.addAttribute('position', new THREE.BufferAttribute(posAttr, 3));
    let cLine = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({color: 0x666666, linewidth: 1})
        );
        
        return cLine;
}
    
function rotateCarousel(dir){

    if(dir == 'left'){

        scaleshift = scaleshift - 1 < 0 ? dataLength - 1 : scaleshift - 1;

    } else if(dir == 'right') {
        
        scaleshift = scaleshift + 1 == dataLength ? 0 : scaleshift + 1;

    }

    let t = new TWEEN.Tween(carouselRot);

        t.to({amount: - scaleshift * Math.PI * 2 / dataLength}, 300)
        .easing(TWEEN.Easing.Cubic.In)
        .onStart(() => {
            flagUpdate = true;
        })
        .onComplete(() => {
            // remove the tween from the array when finished to lessen
            // the load on the render loop
            flagUpdate = false;
            tweens.delete(t);
        })
        .start();

    tweens.add(t);

    updateLabels(masterGroup.children[scaleshift].userData.notes, true);
    displayKeyboard();

}

function getRotation(n) {
    // returns the radians associated with the nth segment of a 
    // circle dived into twelve pieces
    return - n * Math.PI*2 / 12;
}

function screenPosition(obj, camera){
  
    let v = obj.position.clone();
    v.project(camera);
    
    let s = new THREE.Vector3();
    s.x = width/2 * ( 1 + v.x );
    s.y = height/2 * ( 1 - v.y )
    s.z = 0;

    return s;
  
};

function playNote(obj, pitchshift) {
    if(!flagUpdate){ // prevent notes from playing during certain animations

        // play the audio corresponding to the note
        let n = obj.userData.note;
        let source = audioCtx.createBufferSource();
        source.buffer = audioBuffers[n + pitchshift];
        source.connect(audioCtx.destination);
        source.start(0);

        // 'spin' the geometries associated with the note
        let ring = obj.userData.ring

        let rand1 = Math.random() >= 0.5 ? 1 : -1;
        let rand2 = Math.random() >= 0.5 ? 1 : -1;

        let t = new TWEEN.Tween(ring.rotation);
            t.to({x: rand1 * Math.PI * 2, y: rand2 * Math.PI * 2}, 350)
            .easing(TWEEN.Easing.Exponential.Out)
            .onComplete((obj) => {
                obj.x = 0;
                obj.y = 0;
                tweens.delete(t);
            })
            .start();

        tweens.add(t);

        // register the note on the keyboard as well
        playKeyboardNote(n)

    }

}

function resize(){
    width = window.innerWidth;
    height = window.innerHeight;
    
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    updateLabelPositions();
}

function onMouseMove(event) {
    event.preventDefault();
    mouse.x = ( event.clientX / width ) * 2 - 1;
    mouse.y = - ( event.clientY / height ) * 2 + 1;
}

function onMouseDown(event) {
    event.preventDefault();
    if(activePanel != null) {
        rotateCarousel(activePanel.userData.direction);
        activePanel = null;
    }
}