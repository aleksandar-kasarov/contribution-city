# GitHub Contribution City

![Contribution City](../contribution-city.svg)

[English](../README.md) | [한국어](README.ko.md)

---

## 개요

이 프로젝트는 최근 7일간의 GitHub 커밋 수를 기반으로 아이소메트릭 3D 도시를 생성합니다. 각 건물은 하루의 커밋을 나타내며, 커밋 수가 많으면 많을 수록 큰 건물이 생성됩니다!

<br>

## 건물 종류

| 커밋 수 | 건물 | 미리보기 |
|---------|------|----------|
| 0 | 건물 없음 | - |
| 1-3 | 랜턴 (Xsmall.svg) | ![Xsmall](../assets/Xsmall.svg) |
| 4-6 | 파란 집 (Small.svg) | ![Small](../assets/Small.svg) |
| 7-9 | 맨션 (Middle.svg) | ![Middle](../assets/Middle.svg) |
| 10+ | 빨간 타워 (Big.svg) | ![Big](../assets/Big.svg) |

<br>

## 설정 방법

### 1단계. 저장소 생성

- 이 저장소를 Fork하세요. 

### 2단계. Personal Access Token 생성

1. GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. `repo` 권한으로 새 토큰 생성
3. 저장소 Secrets에 `PAT_TOKEN`으로 등록

### 3단계. 워크플로우 실행

1. Actions → Generate Contribution City → Run workflow
2. 완료 후 README.md에 추가:

```md
![Contribution City](https://raw.githubusercontent.com/{{USERNAME}}/{{REPO_NAME}}/main/contribution-city.svg)
```

> `{{USERNAME}}`과 `{{REPO_NAME}}`을 본인 GitHub 사용자 이름과 저장소 이름으로 변경하세요.

## 프로젝트 구조

```
your-repo/
├── .github/
│   └── workflows/
│       └── generate-city.yml
├── assets/
│   ├── font/
│   │   └── Galmuri11.ttf
│   ├── Base.svg
│   ├── Xsmall.svg, Small.svg, Middle.svg, Big.svg
│   ├── MON.svg ~ SUN.svg
│   └── 0.svg ~ 9.svg
├── generate-city.js
└── README.md
```

## 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `PAT_TOKEN` | Yes | 액세스 토큰 |
| `GITHUB_USERNAME` | Yes | 대상 GitHub 사용자 이름 |

## 참고

이 프로젝트는 [github-profile-3d-contrib](https://github.com/yoshi389111/github-profile-3d-contrib) (by yoshi389111)에서 많은 영감을 받았습니다.

## 라이선스

MIT License

## 사용 폰트

- [Galmuri11](https://github.com/quiple/galmuri) by quiple