let img_navbar, img_infoBanner, img_map, img_footer, img_aiIcon, img_olisten, img_otalk, img_tOutput, img_frame;
let table, csvText = "", userSpeechText = "", state = 0;
let scrollOffset = 0, maxScroll = 0;
let apiKey = "AIzaSyD3KbVer5qm207UfKpc3wzOXoACbVCzCCI";
let conversationHistory = [], userHistory = [], aiHistory = [];
let ai_response = "", parsedDisasters = [];
let svgMapDiv, svgContent = "", seoulDistricts = {};

const systemPrompt = "당신은 재난안전 전문가입니다. 제공된 CSV 데이터를 바탕으로 질문에 정확하게 응답하세요. 응답 형식 규칙: 1. 응답은 반드시 구(區) 단위로 구분된 단락으로 구성합니다. 2. 각 단락은 반드시 [시이름]시 [구이름]구로 시작합니다 (예: 서울특별시 강남구).. 3. 각 단락 내 재난 유형은 다음 중 하나로 명확히 표시합니다:  화재 | 산사태 | 강풍주의보 | 강풍 | 싱크홀 | 집중호우 | 호우 4. 재난 설명은 2문장으로 간결히 요약합니다. 5. 모든 재난 설명은 서울특별시 OO구 형식으로 시작해야 합니다.(말투는 ~다 보다는 ~요 체로 친근하게 응답하며 질문에 응답할 때는 지역명을 다시 한 번 언급하고 해당 지역의 재난문자 내용을 2문장으로 간략하게 설명하며 사용자에게 주의/경고를 주세요.) 예시 응답 구조: 중구 \n집중호우로 인한 침수 피해가 우려됩니다. 외출을 자제하시고 대비하세요. \n 2025년 5월 20일 발생. 6. 금지사항: 1. 재난 문자가 발송되었어요 같은 표현 사용 금지 2. 별표(**) 사용 금지, (*)도 사용 금지 3. 지역 구분 시 한 줄 띄우기";

const disasterColors = {
  "화재": "#D4480E",
  "산사태": "#ECD052",
  "강풍": "#429946",
  "싱크홀": "#885D2F",
  "집중호우": "#214FF3"
};

// 🎯 수정된 서울시 25개 구의 중심 좌표 (실제 SVG 좌표계에 맞게 조정)
const districtCenters = {
  "강남구": { x: 0.665, y: 0.72 },    // 비율로 표현 (0~1)
  "강동구": { x: 0.882, y: 0.57 },
  "강북구": { x: 0.592, y: 0.27 },
  "강서구": { x: 0.15, y: 0.5 },
  "관악구": { x: 0.43, y: 0.82 },
  "광진구": { x: 0.75, y: 0.6 },
  "구로구": { x: 0.2, y: 0.72 },
  "금천구": { x: 0.3, y: 0.8 },
  "노원구": { x: 0.75, y: 0.3 },
  "도봉구": { x: 0.63, y: 0.2 },
  "동대문구": { x: 0.67, y: 0.46 },
  "동작구": { x: 0.44, y: 0.7 },
  "마포구": { x: 0.35, y: 0.54 },
  "서대문구": { x: 0.4, y: 0.48 },
  "서초구": { x: 0.58, y: 0.8 },
  "성동구": { x: 0.65, y: 0.57 },
  "성북구": { x: 0.6, y: 0.4 },
  "송파구": { x: 0.8, y: 0.7 },
  "양천구": { x: 0.22, y: 0.65 },
  "영등포구": { x: 0.345, y: 0.65 },
  "용산구": { x: 0.5, y: 0.6 },
  "은평구": { x: 0.4, y: 0.35 },
  "종로구": { x: 0.537, y: 0.47 },
  "중구": { x: 0.55, y: 0.53 },
  "중랑구": { x: 0.78, y: 0.4 }
};

function preload() {
  img_navbar = loadImage('NavBar.png');
  img_infoBanner = loadImage('InfoBanner.png');
  img_map = loadImage('Map.png');
  img_footer = loadImage('Footer.png');
  img_aiIcon = loadImage('aiIcon.png');
  img_olisten = loadImage('Orange_listen.png');
  img_otalk = loadImage('Orange_talk.png');
  img_tOutput = loadImage('talkOutput_ai.png');
  img_frame = loadImage('Frame.png');
  table = loadTable("긴급재난문자.csv", "csv", "header");

  httpGet('seoul.svg', 'text', (data) => {
    svgContent = data;
    parseSVGData();
  }, (error) => {
    console.error("SVG 로드 실패:", error);
  });
}

function parseSVGData() {
  if (!svgContent) return;
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgContent, "image/svg+xml");
  const paths = xmlDoc.getElementsByTagName('path');
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const id = path.getAttribute('id');
    if (id && id.includes('구')) {
      seoulDistricts[id] = {
        id: id,
        originalFill: path.getAttribute('fill') || '#C8C8C8'
      };
    }
  }
}

function setup() {
  createCanvas(393, 852);
  if (!("webkitSpeechRecognition" in window)) {
    noLoop();
  } else {
    speechRecognition = new webkitSpeechRecognition();
    speechRecognition.lang = "ko-KR";
    speechRecognition.continuous = true;
    speechRecognition.onresult = speechResult;
  }
  for (let r = 0; r < table.getRowCount(); r++) {
    let rowStr = "";
    for (let c = 0; c < table.getColumnCount(); c++) {
      rowStr += table.columns[c] + ": " + table.getString(r, c) + "\n";
    }
    csvText += rowStr + "\n";
  }
}

function draw() {
  background(255);

  if (state === 0) {
    image(img_navbar, 0, 0, 393, 124);
    image(img_infoBanner, 0, 124, 393, 287);
    image(img_map, 0, 411, 393, 276);
    image(img_footer, 0, 687, 393, 165);
    image(img_aiIcon, 303, 700, 80, 80);

  } else if (state === 1) {
    image(img_navbar, 0, 0, 393, 124);
    image(img_infoBanner, 0, 124, 393, 287);
    image(img_map, 0, 411, 393, 276);
    image(img_footer, 0, 687, 393, 165);
    image(img_aiIcon, 303, 700, 80, 80);
    image(img_olisten, 0, 0, 393, 852);

  } else if (state === 2) {
    image(img_navbar, 0, 0, 393, 124);
    image(img_infoBanner, 0, 124, 393, 287);
    image(img_map, 0, 411, 393, 276);
    image(img_footer, 0, 687, 393, 165);
    image(img_aiIcon, 303, 700, 80, 80);
    image(img_otalk, 0, 0, 393, 852);
    image(img_tOutput, 22, 228, 359, 596);

    let inputText = userSpeechText || "질문을 입력하세요";
    drawUserBubble(inputText);
    drawAIResponse();

    if (ai_response && ai_response.length > 0) {
      drawMapButton();
    }

  } else if (state === 3) {
    drawMapView();
  }
}

function drawUserBubble(inputText) {
  textSize(14);
  textAlign(LEFT, TOP);
  textWrap(WORD);

  let maxBubbleWidth = 359;
  let padding = 20;
  let lineHeight = 20;

  let tempWords = inputText.split(' ');
  let lines = [];
  let line = "";

  for (let i = 0; i < tempWords.length; i++) {
    let testLine = line + tempWords[i] + " ";
    if (textWidth(testLine) > maxBubbleWidth - padding * 2) {
      lines.push(line.trim());
      line = tempWords[i] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());

  let bubbleHeight = lines.length * lineHeight + padding * 2;
  let bubbleWidth = 0;
  for (let l of lines) {
    bubbleWidth = max(bubbleWidth, textWidth(l));
  }
  bubbleWidth = min(bubbleWidth + padding * 2, maxBubbleWidth);

  let shadowColor = color(0x86, 0xC2, 0x6F, 204);
  fill(shadowColor);
  noStroke();
  rect(24, 142, bubbleWidth, bubbleHeight, 50);

  fill('#FA7910');
  noStroke();
  rect(24, 138, bubbleWidth, bubbleHeight, 50);

  let textTotalHeight = lines.length * lineHeight;
  let textStartY = 138 + (bubbleHeight - textTotalHeight) / 2;

  fill(255);
  for (let l of lines) {
    text(l, 24 + padding, textStartY);
    textStartY += lineHeight;
  }
}

function drawAIResponse() {
  let clipX = 47;
  let clipY = 255;
  let clipW = 300;
  let clipH = 350;

  textSize(14);
  textAlign(LEFT, TOP);
  textWrap(WORD);

  let aiLines = [];
  if (ai_response && ai_response.length > 0) {
    let tempLines = ai_response.split('\n');
    for (let i = 0; i < tempLines.length; i++) {
      let words = tempLines[i].split(' ');
      let l = '';
      for (let j = 0; j < words.length; j++) {
        let testL = l + words[j] + ' ';
        if (textWidth(testL) > clipW) {
          aiLines.push(l);
          l = words[j] + ' ';
        } else {
          l = testL;
        }
      }
      aiLines.push(l);
    }
  }

  let lineHeight = 20;
  let totalHeight = aiLines.length * lineHeight;
  maxScroll = max(0, totalHeight - clipH);
  scrollOffset = constrain(scrollOffset, 0, maxScroll);

  fill(255);
  for (let i = 0; i < aiLines.length; i++) {
    let y = clipY + i * lineHeight - scrollOffset;
    if (y >= clipY && y < clipY + clipH) {
      text(aiLines[i], clipX, y);
    }
  }

  if (totalHeight > clipH) {
    let scrollbarH = map(clipH, 0, totalHeight, 30, clipH);
    let scrollbarY = map(scrollOffset, 0, maxScroll, 0, clipH - scrollbarH);
    fill(200);
    noStroke();
    rect(clipX + clipW + 5, clipY + scrollbarY, 4, scrollbarH, 2);
  }
}

function drawMapButton() {
  let buttonX = 70;
  let buttonY = 620;
  let buttonW = 250;
  let buttonH = 40;

  fill('#4CAF50');
  noStroke();
  rect(buttonX, buttonY, buttonW, buttonH, 20);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  text("지도에서 확인하기", buttonX + buttonW/2, buttonY + buttonH/2);
}

function drawMapView() {
  background(245);

  fill('#FA7910');
  rect(0, 0, width, 60);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(18);
  text("서울시 재난 현황 지도", width/2, 30);

  fill(255);
  rect(10, 15, 60, 30, 5);
  fill(0);
  textSize(14);
  text("< 이전 ", 40, 30);

  if (!svgMapDiv && svgContent) {
    createSVGMap();
  }

  drawBottomLegend();
}

function createSVGMap() {
  if (!svgContent) return;
  if (svgMapDiv) svgMapDiv.remove();

  const headerHeight = 80;
  const legendHeight = 60;
  const padding = 0;

  const mapAreaX = 0;
  const mapAreaY = headerHeight;
  const mapAreaWidth = width;
  const mapAreaHeight = height - headerHeight - legendHeight;

  svgMapDiv = createDiv('').id('svg-map-container');
  svgMapDiv.position(mapAreaX, mapAreaY);
  svgMapDiv.size(mapAreaWidth, mapAreaHeight);
  svgMapDiv.style('overflow', 'hidden');
  svgMapDiv.style('pointer-events', 'none');
  svgMapDiv.style('display', 'flex');
  svgMapDiv.style('align-items', 'center');
  svgMapDiv.style('justify-content', 'center');
  svgMapDiv.style('background', 'none');
  svgMapDiv.style('border', 'none');
  svgMapDiv.style('box-shadow', 'none');

  svgMapDiv.html(svgContent);

  const svgElement = document.querySelector('#svg-map-container svg');
  if (svgElement) {
    const svgWidth = svgElement.viewBox?.baseVal?.width || svgElement.width?.baseVal?.value || 1000;
    const svgHeight = svgElement.viewBox?.baseVal?.height || svgElement.height?.baseVal?.value || 800;

    const scaleX = mapAreaWidth / svgWidth;
    const scaleY = mapAreaHeight / svgHeight;
    const optimalScale = Math.min(scaleX, scaleY);

    const scaledWidth = svgWidth * optimalScale;
    const scaledHeight = svgHeight * optimalScale;
    const offsetX = (mapAreaWidth - scaledWidth) / 2;
    const offsetY = (mapAreaHeight - scaledHeight) / 2;

    svgElement.style.width = scaledWidth + 'px';
    svgElement.style.height = scaledHeight + 'px';
    svgElement.style.position = 'absolute';
    svgElement.style.left = offsetX + 'px';
    svgElement.style.top = offsetY + 'px';
    svgElement.style.border = 'none';
    svgElement.style.borderRadius = '0';
    svgElement.style.boxShadow = 'none';
    svgElement.style.background = 'none';

    // 🎯 수정된 구 이름 라벨 추가 (정확한 위치 계산)
    setTimeout(() => {
      addDistrictLabels(mapAreaX + offsetX, mapAreaY + offsetY, scaledWidth, scaledHeight);
    }, 100);
  }
}

// 🎯 핵심 수정: 비율 기반 좌표로 정확한 텍스트 위치 계산
function addDistrictLabels(mapX, mapY, mapWidth, mapHeight) {
  const svgContainer = document.querySelector('#svg-map-container');
  if (!svgContainer) return;

  // 기존 라벨 제거
  const existingLabels = svgContainer.querySelectorAll('.district-label');
  existingLabels.forEach(label => label.remove());

  // 각 구의 중심에 텍스트 라벨 추가 (비율 기반 위치 계산)
  for (let districtName in districtCenters) {
    const center = districtCenters[districtName];
    
    // 비율(0~1)을 실제 픽셀 좌표로 변환
    const absoluteX = mapX + (center.x * mapWidth);
    const absoluteY = mapY + (center.y * mapHeight);

    // HTML div 요소로 텍스트 라벨 생성
    const label = document.createElement('div');
    label.className = 'district-label';
    label.textContent = districtName;
    label.style.position = 'absolute';
    label.style.left = absoluteX + 'px';
    label.style.top = absoluteY + 'px';
    label.style.transform = 'translate(-50%, -50%)'; // 중앙 정렬
    label.style.fontSize = Math.max(10, Math.min(14, mapWidth / 30)) + 'px'; // 반응형 크기
    label.style.fontWeight = 'bold';
    label.style.color = '#333';
    label.style.textShadow = '2px 2px 4px white, -2px -2px 4px white, 2px -2px 4px white, -2px 2px 4px white';
    label.style.pointerEvents = 'none';
    label.style.userSelect = 'none';
    label.style.zIndex = '1000';
    label.style.whiteSpace = 'nowrap';

    document.body.appendChild(label); // body에 직접 추가
    
    console.log(`라벨 위치: ${districtName} - (${absoluteX.toFixed(0)}, ${absoluteY.toFixed(0)})`);
  }
}

function drawBottomLegend() {
  const legendY = height - 55;
  const legendHeight = 45;
  const padding = 10;

  fill(255, 240);
  stroke(100);
  strokeWeight(1);
  rect(padding, legendY, width - padding * 2, legendHeight, 8);

  fill(0);
  textAlign(LEFT, CENTER);
  textSize(12);
  textStyle(BOLD);
  text("재난 유형:", padding + 10, legendY + legendHeight / 2);

  const disasterTypes = Object.keys(disasterColors);
  const startX = padding + 80;
  const itemWidth = (width - startX - padding - 20) / disasterTypes.length;

  textStyle(NORMAL);
  textSize(9);

  for (let i = 0; i < disasterTypes.length; i++) {
    const disaster = disasterTypes[i];
    const x = startX + i * itemWidth;
    const centerY = legendY + legendHeight / 2;

    fill(disasterColors[disaster]);
    noStroke();
    rect(x, centerY - 6, 12, 12, 2);

    fill(0);
    textAlign(LEFT, CENTER);
    text(disaster, x + 16, centerY);
  }

  fill(100);
  textSize(8);
  textStyle(ITALIC);
  textAlign(CENTER, CENTER);
  text("재난 발생 구역은 해당 색상으로 표시됩니다", width/2, legendY + legendHeight - 8);
}

function parseDisasterInfo(response) {
  let disasters = [];
  const paragraphs = response.split('\n\n');
  for (const para of paragraphs) {
    const districtMatch = para.match(/([가-힣]+시)\s*([가-힣]+구)/);
    if (!districtMatch) continue;
    const district = districtMatch[2];
    const disasterMatch = para.match(/(화재|산사태|강풍주의보|강풍|싱크홀|집중호우|호우)/g);
    if (disasterMatch) {
      const cleanedDisasters = new Set();
      for (const d of disasterMatch) {
        const cleanD = d.replace(/\s+/g, '');
        if (cleanD === '강풍주의보' || cleanD === '강풍') {
          cleanedDisasters.add('강풍');
        } else if (cleanD === '호우') {
          cleanedDisasters.add('집중호우');
        } else {
          cleanedDisasters.add(cleanD);
        }
      }
      for (const disaster of cleanedDisasters) {
        disasters.push({ district, disaster });
      }
    }
  }
  console.log("=== 파싱된 재난 정보 (통합) ===");
  console.table(disasters);
  return disasters;
}

function colorDistricts() {
  const svgContainer = document.querySelector('#svg-map-container');
  if (!svgContainer) {
    console.error("SVG 컨테이너를 찾을 수 없습니다");
    return;
  }
  const svgElement = svgContainer.querySelector('svg');
  if (!svgElement) {
    console.error("SVG 요소를 찾을 수 없습니다");
    return;
  }
  const paths = svgElement.querySelectorAll('path[id]');

  paths.forEach(path => {
    path.setAttribute('fill', '#C8C8C8');
    path.setAttribute('stroke', '#666');
    path.setAttribute('stroke-width', '1');
  });

  for (let info of parsedDisasters) {
    const path = svgElement.querySelector(`path[id="${info.district}"]`);
    if (path && disasterColors[info.disaster]) {
      path.setAttribute('fill', disasterColors[info.disaster]);
      path.setAttribute('stroke', '#000');
      path.setAttribute('stroke-width', '2');
      console.log(`색칠 완료: ${info.district} -> ${disasterColors[info.disaster]}`);
    } else {
      console.error(`❌ path를 찾을 수 없음: ${info.district}`);
    }
  }
}

function updateMapData() {
  parsedDisasters = parseDisasterInfo(ai_response);
  if (parsedDisasters.length > 0) {
    setTimeout(() => colorDistricts(), 500);
  }
}

function mouseClicked() {
  if (mouseX >= 320 && mouseX <= 380 && mouseY >= 688 && mouseY <= 748) {
    if (state === 0 || state === 2 || state === 3) {
      state = 1;
      userSpeechText = "";
      ai_response = "";
      startSpeechRecognition();
    } else if (state === 1) {
      state = 2;
      if (ai_response) {
        speakText(ai_response);
      }
    }
  }
  if (state === 2 && mouseX >= 70 && mouseX <= 320 && mouseY >= 620 && mouseY <= 660) {
    updateMapData();
    state = 3;
  }
  if (state === 3 && mouseX >= 10 && mouseX <= 70 && mouseY >= 15 && mouseY <= 45) {
    // 라벨 정리
    const labels = document.querySelectorAll('.district-label');
    labels.forEach(label => label.remove());
    
    if (svgMapDiv) {
      svgMapDiv.remove();
      svgMapDiv = null;
    }
    state = 2;
  }
}

function startSpeechRecognition() {
  if (speechRecognition) {
    speechRecognition.start();
  }
}

function speechResult(event) {
  try {
    let speechInput = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join("");
    if (event.results[event.results.length - 1].isFinal) {
      userSpeechText = speechInput;
      speechRecognition.stop();
      generateResponse(speechInput);
    }
  } catch (error) {
    console.error("speechResult 오류:", error);
  }
}

async function generateResponse(question) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + apiKey;
  conversationHistory = [
    {
      role: "user",
      parts: [{ text: systemPrompt + "\n\nCSV 데이터:\n" + csvText }]
    },
    {
      role: "user",
      parts: [{ text: question }]
    }
  ];
  userHistory.push(question);

  let requestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: conversationHistory
  };

  try {
    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error("API error: " + response.status + " - " + errorText);
    }

    let data = await response.json();

    if (data.candidates && data.candidates.length > 0) {
      ai_response = data.candidates[0].content.parts[0].text.replaceAll("**", "");
    } else {
      ai_response = "답변을 받을 수 없습니다.";
    }
    state = 2;
    speakText(ai_response);
    aiHistory.push(ai_response);
    conversationHistory.push({
      role: "model",
      parts: [{ text: ai_response }]
    });
  } catch (error) {
    ai_response = "AI 응답 생성 중 오류가 발생했습니다: " + error.message;
    state = 2;
  }
}

async function speakText(text) {
  let ttsUrl = "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + apiKey;
  let requestBody = {
    audioConfig: {
      audioEncoding: "MP3",
      effectsProfileId: ["telephony-class-application"],
      pitch: 0,
      speakingRate: 1
    },
    input: { text: text },
    voice: {
      languageCode: "ko-KR",
      name: "ko-KR-Standard-A"
    }
  };
  try {
    let response = await fetch(ttsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error("TTS error: " + response.status + " - " + errorText);
    }
    let data = await response.json();
    if (data.audioContent) {
      let audioData = "data:audio/mp3;base64," + data.audioContent;
      let audio = new Audio(audioData);
      audio.oncanplaythrough = () => audio.play();
      audio.play();
    }
  } catch (error) {
    // 무음 처리
  }
}

function mouseWheel(event) {
  if (state === 2) {
    scrollOffset += event.delta / 2;
    scrollOffset = constrain(scrollOffset, 0, maxScroll);
    return false;
  }
}
