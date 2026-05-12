// Three.js 설정
let scene, camera, renderer, sphere, frontTexture, backTexture;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let sphereRotation = { x: 0, y: 0 };
let ambientLight, directionalLight;
let lightingEnabled = true;
let accessoryTexture = null;
let accessoryPlane = null;

// 초기화
function init() {
    // Scene 생성
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Camera 생성
    const canvas = document.getElementById('canvas3d');
    camera = new THREE.PerspectiveCamera(
        75,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
    );
    camera.position.z = 100;

    // Renderer 생성
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // 조명 추가 (강도 낮춤)
    ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // 구 생성
    createSphere(30, 30, 15, 10, 40);

    // 이벤트 리스너
    setupEventListeners();

    // 애니메이션 시작
    animate();
}

// 구 생성 함수
function createSphere(height, width, compressionVertical, compressionHorizontal, compressionSide) {
    // 기존 구 제거
    if (sphere) {
        scene.remove(sphere);
        // Group 내의 모든 mesh의 geometry와 material 정리
        sphere.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }

    // 반지름 계산 (높이와 길이의 평균)
    const radius = (height + width) / 2;

    // 눌린 정도 적용
    const compressionFactorVertical = 1 - (compressionVertical / 100); // Y축 (상하)
    const compressionFactorHorizontal = 1 - (compressionHorizontal / 100); // Z축 (앞뒤)
    const compressionFactorSide = 1 - (compressionSide / 100); // X축 (양옆)

    // 기본 재질 (텍스처가 없을 때)
    const defaultFrontMaterial = new THREE.MeshPhongMaterial({
        color: 0xaaaaff,
        side: THREE.DoubleSide
    });

    const defaultBackMaterial = new THREE.MeshPhongMaterial({
        color: 0xffaaaa,
        side: THREE.DoubleSide
    });

    // 앞면 구 (0 ~ PI)
    const frontGeometry = new THREE.SphereGeometry(
        radius,
        64,
        64,
        -Math.PI / 2, // 앞면 시작
        Math.PI,      // 앞면 범위
        0,
        Math.PI
    );

    // 앞면용 재질
    let frontMaterial;
    if (frontTexture) {
        // 텍스처 설정 조정 - 도안이 중앙에 오도록
        const clonedFrontTexture = frontTexture.clone();
        clonedFrontTexture.needsUpdate = true;
        clonedFrontTexture.center.set(0.5, 0.5);

        // 이미지 비율에 맞춰 repeat 계산
        // 구의 UV 매핑은 세로 방향으로 늘어나므로, 세로를 더 줄여서 보정
        const baseRepeat = 0.8;
        const aspectRatio = frontTexture.imageAspectRatio || 1.2;
        const horizontalExpansion = 0.9; // 가로 방향 확장 계수
        const verticalCompensation = 1.8; // 세로 방향 압축 계수
        clonedFrontTexture.repeat.set(baseRepeat * aspectRatio * horizontalExpansion, baseRepeat * verticalCompensation);
        clonedFrontTexture.offset.set(0, 0); // 중앙 배치

        frontMaterial = new THREE.MeshPhongMaterial({
            map: clonedFrontTexture,
            side: THREE.DoubleSide,
            transparent: true
        });
    } else {
        frontMaterial = defaultFrontMaterial;
    }

    const frontSphere = new THREE.Mesh(frontGeometry, frontMaterial);

    // 뒷면 구 (PI ~ 2PI)
    const backGeometry = new THREE.SphereGeometry(
        radius,
        64,
        64,
        Math.PI / 2,  // 뒷면 시작
        Math.PI,      // 뒷면 범위
        0,
        Math.PI
    );

    // 뒷면용 재질
    let backMaterial;
    if (backTexture) {
        // 텍스처 설정 조정 - 도안이 중앙에 오도록
        const clonedBackTexture = backTexture.clone();
        clonedBackTexture.needsUpdate = true;
        clonedBackTexture.center.set(0.5, 0.5);

        // 이미지 비율에 맞춰 repeat 계산
        // 구의 UV 매핑은 세로 방향으로 늘어나므로, 세로를 더 줄여서 보정
        const baseRepeat = 0.8;
        const aspectRatio = backTexture.imageAspectRatio || 1.2;
        const horizontalExpansion = 0.9; // 가로 방향 확장 계수
        const verticalCompensation = 1.8; // 세로 방향 압축 계수
        clonedBackTexture.repeat.set(baseRepeat * aspectRatio * horizontalExpansion, baseRepeat * verticalCompensation);
        clonedBackTexture.offset.set(0, 0); // 중앙 배치

        backMaterial = new THREE.MeshPhongMaterial({
            map: clonedBackTexture,
            side: THREE.DoubleSide,
            transparent: true
        });
    } else {
        backMaterial = defaultBackMaterial;
    }

    const backSphere = new THREE.Mesh(backGeometry, backMaterial);

    // 그룹으로 합치기
    sphere = new THREE.Group();
    sphere.add(frontSphere);
    sphere.add(backSphere);

    // 눌린 정도 적용
    sphere.scale.y = compressionFactorVertical; // 상하 눌림
    sphere.scale.z = compressionFactorHorizontal; // 앞뒤 눌림
    sphere.scale.x = compressionFactorSide; // 양옆 눌림

    // 이전 회전값 적용
    sphere.rotation.x = sphereRotation.x;
    sphere.rotation.y = sphereRotation.y;

    scene.add(sphere);

    // 액세서리 평면 추가
    createAccessoryPlane();
}

// 액세서리 평면 생성 함수
function createAccessoryPlane() {
    // 기존 액세서리 제거
    if (accessoryPlane) {
        sphere.remove(accessoryPlane);
        if (accessoryPlane.geometry) accessoryPlane.geometry.dispose();
        if (accessoryPlane.material) accessoryPlane.material.dispose();
    }

    // 액세서리 재질 (텍스처가 있으면 사용, 없으면 투명)
    let material;
    if (accessoryTexture) {
        material = new THREE.MeshBasicMaterial({
            map: accessoryTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
    } else {
        material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
    }

    // 구 위쪽에 평면 생성 (앞뒤면 사이에 위치)
    const geometry = new THREE.PlaneGeometry(50, 50);
    accessoryPlane = new THREE.Mesh(geometry, material);
    accessoryPlane.position.set(0, 20, 0); // 구 위쪽 중앙에 위치
    accessoryPlane.rotation.y = Math.PI / 2; // Y축 기준 90도 회전 (앞뒤면 사이)

    sphere.add(accessoryPlane);
}

// 이미지 로드 함수
function loadImage(file, isFront) {
    const reader = new FileReader();
    reader.onload = function(e) {
        // 이미지 비율 계산을 위해 Image 객체 먼저 로드
        const img = new Image();
        img.onload = function() {
            const loader = new THREE.TextureLoader();
            loader.load(e.target.result, function(texture) {
                // 이미지 비율 저장
                texture.imageAspectRatio = img.width / img.height;

                if (isFront) {
                    frontTexture = texture;
                } else {
                    backTexture = texture;
                }

                // 구 재생성
                const height = parseFloat(document.getElementById('height').value);
                const width = parseFloat(document.getElementById('width').value);
                const compressionVertical = parseFloat(document.getElementById('compressionVertical').value);
                const compressionHorizontal = parseFloat(document.getElementById('compressionHorizontal').value);
                const compressionSide = parseFloat(document.getElementById('compressionSide').value);
                createSphere(height, width, compressionVertical, compressionHorizontal, compressionSide);
            });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 액세서리 이미지 로드 함수
function loadAccessoryImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const loader = new THREE.TextureLoader();
        loader.load(e.target.result, function(texture) {
            accessoryTexture = texture;
            createAccessoryPlane();
        });
    };
    reader.readAsDataURL(file);
}

// 이벤트 리스너 설정
function setupEventListeners() {
    const canvas = document.getElementById('canvas3d');

    // 마우스 드래그로 회전
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = {
            x: e.clientX,
            y: e.clientY
        };
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging && sphere) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            sphere.rotation.y += deltaX * 0.01;
            sphere.rotation.x += deltaY * 0.01;

            sphereRotation.x = sphere.rotation.x;
            sphereRotation.y = sphere.rotation.y;

            previousMousePosition = {
                x: e.clientX,
                y: e.clientY
            };
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    // 마우스 휠로 줌
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        camera.position.z += e.deltaY * 0.1;
        camera.position.z = Math.max(30, Math.min(200, camera.position.z));
    });

    // 입력값 변경 시 구 재생성
    document.getElementById('height').addEventListener('input', updateSphere);
    document.getElementById('width').addEventListener('input', updateSphere);
    document.getElementById('compressionVertical').addEventListener('input', updateSphere);
    document.getElementById('compressionHorizontal').addEventListener('input', updateSphere);
    document.getElementById('compressionSide').addEventListener('input', updateSphere);

    // 이미지 업로드
    document.getElementById('frontImage').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            loadImage(e.target.files[0], true);
        }
    });

    document.getElementById('backImage').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            loadImage(e.target.files[0], false);
        }
    });

    document.getElementById('accessoryImage').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            loadAccessoryImage(e.target.files[0]);
        }
    });

    // 조명 토글
    document.getElementById('toggleLighting').addEventListener('click', (e) => {
        lightingEnabled = !lightingEnabled;

        if (lightingEnabled) {
            ambientLight.intensity = 0.4;
            directionalLight.intensity = 0.5;
            e.target.textContent = '조명 끄기';
        } else {
            ambientLight.intensity = 1.0;
            directionalLight.intensity = 0;
            e.target.textContent = '조명 켜기';
        }
    });

    // 만두인형 모드
    document.getElementById('mandooMode').addEventListener('click', () => {
        // 만두인형은 더 납작한 형태
        document.getElementById('compressionVertical').value = 35;
        document.getElementById('compressionHorizontal').value = 0;
        document.getElementById('compressionSide').value = 25;
        updateSphere();
    });

    // 카메라 리셋
    document.getElementById('resetCamera').addEventListener('click', () => {
        camera.position.set(0, 0, 100);
        if (sphere) {
            sphere.rotation.set(0, 0, 0);
            sphereRotation = { x: 0, y: 0 };
        }
    });

    // 창 크기 변경 대응
    window.addEventListener('resize', onWindowResize);
}

// 구 업데이트
function updateSphere() {
    const height = parseFloat(document.getElementById('height').value);
    const width = parseFloat(document.getElementById('width').value);
    const compressionVertical = parseFloat(document.getElementById('compressionVertical').value);
    const compressionHorizontal = parseFloat(document.getElementById('compressionHorizontal').value);
    const compressionSide = parseFloat(document.getElementById('compressionSide').value);
    createSphere(height, width, compressionVertical, compressionHorizontal, compressionSide);
}

// 창 크기 변경 처리
function onWindowResize() {
    const canvas = document.getElementById('canvas3d');
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
}

// 애니메이션 루프
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// 페이지 로드 시 초기화
window.addEventListener('load', init);
