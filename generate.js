const https = require('https');
const fs = require('fs');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = process.env.USERNAME;

// GraphQL 쿼리로 contribution 데이터 가져오기
async function fetchContributions() {
    const query = `
    query($username: String!) {
        user(login: $username) {
            contributionsCollection {
                contributionCalendar {
                    totalContributions
                    weeks {
                        contributionDays {
                            contributionCount
                            date
                            weekday
                        }
                    }
                }
            }
        }
    }`;

    const body = JSON.stringify({
        query,
        variables: { username: USERNAME }
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.github.com',
            path: '/graphql',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'contribution-city-generator'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.errors) {
                        reject(new Error(JSON.stringify(json.errors)));
                    } else {
                        resolve(json.data.user.contributionsCollection.contributionCalendar);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// 최근 7일 데이터 추출
function getLastWeekData(calendar) {
    const allDays = calendar.weeks.flatMap(w => w.contributionDays);
    return allDays.slice(-7);
}

// SVG 생성
function generateSVG(weekData, totalContributions) {
    const width = 900;
    const height = 500;
    
    // 등각투영 변환 함수
    const isoX = (x, y) => 450 + (x - y) * 0.7;
    const isoY = (x, y, z) => 280 + (x + y) * 0.4 - z;
    
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    
    let buildings = '';
    let labels = '';
    let stars = '';
    
    // 별 생성
    for (let i = 0; i < 60; i++) {
        const x = Math.random() * width;
        const y = Math.random() * 180;
        const r = Math.random() * 1.5 + 0.5;
        const delay = (Math.random() * 3).toFixed(1);
        stars += `<circle class="star" cx="${x}" cy="${y}" r="${r}" fill="white" style="animation-delay: ${delay}s"/>`;
    }
    
    // 오늘 커밋 수 (마지막 날)
    const todayContributions = weekData[weekData.length - 1].contributionCount;
    
    // 건물 배치 설정
    const buildingWidth = 60;
    const buildingDepth = 40;
    const spacing = 85;
    const baseX = -180;
    const baseY = 80;
    const maxHeight = 180;
    
    // 뒤에서부터 그리기 (z-order)
    for (let i = 0; i < 7; i++) {
        const day = weekData[i];
        const count = day.contributionCount;
        
        const x = baseX + i * spacing;
        const y = baseY + i * 20; // 언덕 경사
        
        if (count === 0) {
            // 가로등 그리기
            const lampX = isoX(x + 30, y + 20);
            const lampBaseY = isoY(x + 30, y + 20, 0);
            const lampTopY = isoY(x + 30, y + 20, 80);
            
            buildings += `
                <g class="lamp">
                    <!-- 가로등 기둥 -->
                    <rect x="${lampX - 3}" y="${lampTopY}" width="6" height="${lampBaseY - lampTopY}" fill="#3a3a3a"/>
                    <!-- 가로등 머리 -->
                    <ellipse cx="${lampX}" cy="${lampTopY - 5}" rx="12" ry="6" fill="#2a2a2a"/>
                    <!-- 불빛 -->
                    <ellipse class="lamp-glow" cx="${lampX}" cy="${lampTopY}" rx="20" ry="10" fill="#ffdd66" opacity="0.3"/>
                    <ellipse cx="${lampX}" cy="${lampTopY - 3}" rx="8" ry="4" fill="#ffeeaa"/>
                    <!-- 불빛 아래로 -->
                    <polygon points="${lampX - 15},${lampTopY + 5} ${lampX + 15},${lampTopY + 5} ${lampX + 25},${lampBaseY - 20} ${lampX - 25},${lampBaseY - 20}" fill="#ffdd66" opacity="0.1"/>
                </g>
            `;
            
            labels += `
                <text x="${lampX}" y="${lampTopY - 25}" text-anchor="middle" fill="#8899aa" font-family="'Courier New', monospace" font-size="11" font-weight="bold">${dayNames[day.weekday]}</text>
                <text x="${lampX}" y="${lampTopY - 12}" text-anchor="middle" fill="#ffdd66" font-family="'Courier New', monospace" font-size="14" font-weight="bold">${count}</text>
            `;
        } else {
            // 건물 높이 계산
            const bHeight = Math.max(40, (count / 20) * maxHeight);
            
            // 건물 꼭지점 계산
            const p = {
                // 바닥 4점
                f1: { x: isoX(x, y), y: isoY(x, y, 0) },
                f2: { x: isoX(x + buildingWidth, y), y: isoY(x + buildingWidth, y, 0) },
                f3: { x: isoX(x + buildingWidth, y + buildingDepth), y: isoY(x + buildingWidth, y + buildingDepth, 0) },
                f4: { x: isoX(x, y + buildingDepth), y: isoY(x, y + buildingDepth, 0) },
                // 지붕 4점
                t1: { x: isoX(x, y), y: isoY(x, y, bHeight) },
                t2: { x: isoX(x + buildingWidth, y), y: isoY(x + buildingWidth, y, bHeight) },
                t3: { x: isoX(x + buildingWidth, y + buildingDepth), y: isoY(x + buildingWidth, y + buildingDepth, bHeight) },
                t4: { x: isoX(x, y + buildingDepth), y: isoY(x, y + buildingDepth, bHeight) }
            };
            
            // 건물 색상
            const baseColor = '#4a4a3a';
            const leftColor = '#3a3a2a';
            const rightColor = '#5a5a4a';
            const roofColor = '#6a6a5a';
            
            // 창문 생성
            let windows = '';
            const winRows = Math.floor(bHeight / 25);
            const winCols = 3;
            const winWidth = 10;
            const winHeight = 14;
            
            for (let row = 0; row < winRows; row++) {
                for (let col = 0; col < winCols; col++) {
                    const wz = bHeight - 20 - row * 25;
                    if (wz < 15) continue;
                    
                    const wx = x + 10 + col * 18;
                    const wy = y + 5;
                    
                    const isLit = Math.random() > 0.2;
                    const glowColor = isLit ? '#ffdd66' : '#1a1a15';
                    const opacity = isLit ? (0.8 + Math.random() * 0.2).toFixed(2) : '0.9';
                    
                    // 정면 창문
                    const wx1 = isoX(wx, wy);
                    const wy1 = isoY(wx, wy, wz);
                    const wx2 = isoX(wx + winWidth, wy);
                    const wy2 = isoY(wx + winWidth, wy, wz);
                    const wx3 = isoX(wx + winWidth, wy);
                    const wy3 = isoY(wx + winWidth, wy, wz - winHeight);
                    const wx4 = isoX(wx, wy);
                    const wy4 = isoY(wx, wy, wz - winHeight);
                    
                    windows += `<polygon class="window" points="${wx1},${wy1} ${wx2},${wy2} ${wx3},${wy3} ${wx4},${wy4}" fill="${glowColor}" opacity="${opacity}"/>`;
                    
                    // 오른쪽 면 창문
                    const rwx = x + buildingWidth - 3;
                    const rwy = y + 8 + col * 12;
                    if (col < 2) {
                        const rwx1 = isoX(rwx, rwy);
                        const rwy1 = isoY(rwx, rwy, wz);
                        const rwx2 = isoX(rwx, rwy + 8);
                        const rwy2 = isoY(rwx, rwy + 8, wz);
                        const rwx3 = isoX(rwx, rwy + 8);
                        const rwy3 = isoY(rwx, rwy + 8, wz - winHeight);
                        const rwx4 = isoX(rwx, rwy);
                        const rwy4 = isoY(rwx, rwy, wz - winHeight);
                        
                        windows += `<polygon class="window" points="${rwx1},${rwy1} ${rwx2},${rwy2} ${rwx3},${rwy3} ${rwx4},${rwy4}" fill="${glowColor}" opacity="${opacity}"/>`;
                    }
                }
            }
            
            buildings += `
                <g class="building">
                    <!-- 왼쪽 면 -->
                    <polygon points="${p.f1.x},${p.f1.y} ${p.t1.x},${p.t1.y} ${p.t4.x},${p.t4.y} ${p.f4.x},${p.f4.y}" fill="${leftColor}"/>
                    <!-- 정면 -->
                    <polygon points="${p.f1.x},${p.f1.y} ${p.t1.x},${p.t1.y} ${p.t2.x},${p.t2.y} ${p.f2.x},${p.f2.y}" fill="${baseColor}"/>
                    <!-- 오른쪽 면 -->
                    <polygon points="${p.f2.x},${p.f2.y} ${p.t2.x},${p.t2.y} ${p.t3.x},${p.t3.y} ${p.f3.x},${p.f3.y}" fill="${rightColor}"/>
                    <!-- 지붕 -->
                    <polygon points="${p.t1.x},${p.t1.y} ${p.t2.x},${p.t2.y} ${p.t3.x},${p.t3.y} ${p.t4.x},${p.t4.y}" fill="${roofColor}"/>
                    <!-- 창문 -->
                    ${windows}
                </g>
            `;
            
            // 라벨 (건물 위)
            const labelX = isoX(x + buildingWidth/2, y + buildingDepth/2);
            const labelY = isoY(x + buildingWidth/2, y + buildingDepth/2, bHeight + 15);
            
            labels += `
                <text x="${labelX}" y="${labelY}" text-anchor="middle" fill="#8899aa" font-family="'Courier New', monospace" font-size="12" font-weight="bold">${dayNames[day.weekday]}</text>
                <text x="${labelX}" y="${labelY + 16}" text-anchor="middle" fill="#ffdd66" font-family="'Courier New', monospace" font-size="16" font-weight="bold">${count}</text>
            `;
        }
    }
    
    // 도로 생성
    const roadStart = { x: isoX(-250, 200), y: isoY(-250, 200, 0) };
    const roadEnd = { x: isoX(500, -50), y: isoY(500, -50, 0) };
    const roadWidth = 35;
    
    const road = `
        <!-- 도로 -->
        <polygon points="
            ${isoX(-250, 180)},${isoY(-250, 180, 0)}
            ${isoX(500, -70)},${isoY(500, -70, 0)}
            ${isoX(500, -30)},${isoY(500, -30, 0)}
            ${isoX(-250, 220)},${isoY(-250, 220, 0)}
        " fill="#2a2a2a"/>
        <!-- 도로 중앙선 -->
        <line x1="${isoX(-200, 200)}" y1="${isoY(-200, 200, 0)}" x2="${isoX(450, -50)}" y2="${isoY(450, -50, 0)}" stroke="#ffff66" stroke-width="2" stroke-dasharray="20,15" opacity="0.7"/>
    `;
    
    // 자동차
    const car1X = 180;
    const car1Y = 160;
    const car = `
        <g class="car">
            <!-- 자동차 본체 -->
            <polygon points="
                ${isoX(car1X, car1Y)},${isoY(car1X, car1Y, 8)}
                ${isoX(car1X + 35, car1Y)},${isoY(car1X + 35, car1Y, 8)}
                ${isoX(car1X + 35, car1Y + 18)},${isoY(car1X + 35, car1Y + 18, 8)}
                ${isoX(car1X, car1Y + 18)},${isoY(car1X, car1Y + 18, 8)}
            " fill="#1a1a1a"/>
            <!-- 자동차 지붕 -->
            <polygon points="
                ${isoX(car1X + 8, car1Y + 3)},${isoY(car1X + 8, car1Y + 3, 18)}
                ${isoX(car1X + 28, car1Y + 3)},${isoY(car1X + 28, car1Y + 3, 18)}
                ${isoX(car1X + 28, car1Y + 15)},${isoY(car1X + 28, car1Y + 15, 18)}
                ${isoX(car1X + 8, car1Y + 15)},${isoY(car1X + 8, car1Y + 15, 18)}
            " fill="#2a2a2a"/>
            <!-- 헤드라이트 -->
            <ellipse cx="${isoX(car1X + 34, car1Y + 6)}" cy="${isoY(car1X + 34, car1Y + 6, 6)}" rx="3" ry="2" fill="#ffff99"/>
            <ellipse cx="${isoX(car1X + 34, car1Y + 12)}" cy="${isoY(car1X + 34, car1Y + 12, 6)}" rx="3" ry="2" fill="#ffff99"/>
            <!-- 테일라이트 -->
            <ellipse cx="${isoX(car1X + 1, car1Y + 6)}" cy="${isoY(car1X + 1, car1Y + 6, 6)}" rx="2" ry="1.5" fill="#ff3333"/>
            <ellipse cx="${isoX(car1X + 1, car1Y + 12)}" cy="${isoY(car1X + 1, car1Y + 12, 6)}" rx="2" ry="1.5" fill="#ff3333"/>
        </g>
    `;
    
    // 잔디/언덕
    const grass = `
        <!-- 언덕 (위쪽) -->
        <polygon points="
            0,${isoY(-300, 0, 0)}
            ${isoX(-300, 0)},${isoY(-300, 0, 0)}
            ${isoX(600, -100)},${isoY(600, -100, 0)}
            ${width},${isoY(600, -100, 0)}
            ${width},0
            0,0
        " fill="#2a4a2a"/>
        
        <!-- 언덕 (아래쪽) -->
        <polygon points="
            0,${height}
            0,${isoY(-300, 300, 0)}
            ${isoX(-300, 300)},${isoY(-300, 300, 0)}
            ${isoX(600, 100)},${isoY(600, 100, 0)}
            ${width},${isoY(600, 100, 0)}
            ${width},${height}
        " fill="#1a3a1a"/>
    `;
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a15"/>
      <stop offset="60%" style="stop-color:#1a1a2a"/>
      <stop offset="100%" style="stop-color:#2a2a3a"/>
    </linearGradient>
    
    <style>
      @keyframes twinkle {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
      }
      @keyframes windowFlicker {
        0%, 90%, 100% { opacity: 1; }
        95% { opacity: 0.6; }
      }
      @keyframes lampGlow {
        0%, 100% { opacity: 0.3; r: 20; }
        50% { opacity: 0.5; r: 25; }
      }
      .star { animation: twinkle 2s ease-in-out infinite; }
      .window { animation: windowFlicker 5s ease-in-out infinite; }
      .lamp-glow { animation: lampGlow 3s ease-in-out infinite; }
    </style>
  </defs>
  
  <!-- 배경 하늘 -->
  <rect width="${width}" height="${height}" fill="url(#skyGradient)"/>
  
  <!-- 별 -->
  ${stars}
  
  <!-- 달 -->
  <circle cx="800" cy="80" r="45" fill="#ffffee" opacity="0.95"/>
  <circle cx="790" cy="70" r="8" fill="#eeeedd" opacity="0.4"/>
  <circle cx="810" cy="90" r="5" fill="#eeeedd" opacity="0.3"/>
  
  <!-- 잔디/언덕 -->
  ${grass}
  
  <!-- 도로 -->
  ${road}
  
  <!-- 자동차 -->
  ${car}
  
  <!-- 건물들 -->
  ${buildings}
  
  <!-- 라벨들 -->
  ${labels}
  
  <!-- 타이틀 -->
  <text x="${width/2}" y="40" text-anchor="middle" fill="#ffffff" font-family="'Courier New', monospace" font-size="28" font-weight="bold">
    Contribution City
  </text>
  
  <!-- 왼쪽 하단 통계 -->
  <text x="30" y="${height - 50}" fill="#ffffff" font-family="'Courier New', monospace" font-size="16" font-weight="bold">
    TOTAL: <tspan fill="#ffdd66">${totalContributions}</tspan>
  </text>
  <text x="30" y="${height - 25}" fill="#ffffff" font-family="'Courier New', monospace" font-size="16" font-weight="bold">
    TODAY: <tspan fill="#ffdd66">${todayContributions}</tspan>
  </text>
</svg>`;

    return svg;
}

// 메인 실행
async function main() {
    try {
        console.log(`Fetching contributions for ${USERNAME}...`);
        const calendar = await fetchContributions();
        
        console.log(`Total contributions: ${calendar.totalContributions}`);
        
        const weekData = getLastWeekData(calendar);
        console.log('Last 7 days:', weekData.map(d => `${d.date}: ${d.contributionCount}`).join(', '));
        
        const svg = generateSVG(weekData, calendar.totalContributions);
        
        if (!fs.existsSync('profile-3d-contrib')) {
            fs.mkdirSync('profile-3d-contrib');
        }
        
        fs.writeFileSync('profile-3d-contrib/contribution-city.svg', svg);
        console.log('Generated: profile-3d-contrib/contribution-city.svg');
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();