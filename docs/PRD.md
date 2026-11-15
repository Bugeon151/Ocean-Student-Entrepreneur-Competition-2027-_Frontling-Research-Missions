# FRONTLING RESEARCH MISSIONS
## Product Requirements Document (PRD)

**The Research Lab Without the Lab**

| 항목 | 내용 |
|---|---|
| 문서 버전 | **2.1 — Competition Edition (구현 반영판)** |
| 작성일 | 2026년 11월 15일 |
| 프로젝트 | Frontling Research Missions |
| 목표 대회 | Blue Ocean Student Entrepreneur Competition 2027 |
| 목표 | 세계 종합 1위 (목표이며 예측이 아님) |
| 제품 유형 | EdTech / Research Infrastructure / Scientific Reproducibility |
| 타깃 | 연구 경험에 접근하기 어려운 고등학생 및 학교 |
| 현재 단계 | **Phase A 기술 구현 완료(v1.0.0), 검증 단계** |
| 출시 전략 | 사용자 확보 없이 기술·경제성 검증 우선 + **소규모 수요 인터뷰** |
| 최종 제출 마감 | 2027년 2월 21일 23:59 (제출자 현지 시각) |
| 저장소 | github.com/Bugeon151/Ocean-Student-Entrepreneur-Competition-2027-_Frontling-Research-Missions |

---

## 0. v2.0 → v2.1 변경 요약

| 영역 | v2.0 | v2.1 | 변경 이유 |
|---|---|---|---|
| 초기 미션 | GISTEMP, CIFAR-10-C, PTB-XL | **GISTEMP(대표) + Keeling CO₂** 완성. CIFAR-10-C·PTB-XL은 대회 이후로 이동 | 5분 영상에서 보여줄 수 있는 미션은 1개. CIFAR-10-C는 브라우저 용량 한계, PTB-XL은 미성년자 대상 의료 데이터 위험 |
| 미션 2 | CIFAR-10-C (머신러닝) | **Keeling et al. 1976 재검증 (대기 CO₂)** | 실제 논문의 수치(3.4%)를 현재 데이터로 재계산하고 차이를 설명하는, "재현"의 본질을 보여주는 사례 |
| 사용자 검증 | 전혀 하지 않음 | **학생·교사 15~20명 수요 인터뷰** (사용자 확보·학습 효과 주장 아님) | 공식 심사 기준이 사업성 근거로 "end-user feedback"을 명시 |
| 기술 스택 | React+TS 권장 | **Vite + TypeScript (프레임워크 없음)** 확정 | 앱 셸 gzip 15.7 KB, 의존성 0개 런타임 |
| 진행 저장 | IndexedDB 우선 | **localStorage**(예외 처리 포함) | 미션당 상태가 수십 KB 이하라 IndexedDB 불필요 |
| 제출 절차 | 미기재 | **미니 강좌 이수, 공식 피치 템플릿, YouTube 해시태그** 추가 | 공식 제출 요건 |
| 시장 규모 | 틀만 존재 | **미국 공립 9~12학년 1,560만 명**(NCES) 기준으로 SAM 산정 | 근거 있는 숫자 필요 |
| 검토 상태 | 정의만 존재 | 두 미션 모두 **INTERNAL_REVIEWED**, DOMAIN_REVIEWED는 주장하지 않음 | 정직성 |

---

# 1. Executive Summary

## 1.1 제품 정의

Frontling Research Missions는 전문 연구 멘토나 실험실이 없는 학생도 실제 과학 논문을 이해하고, 공개 데이터를 분석해 연구 결과의 일부를 재현하며, 배운 방법을 새로운 데이터에 적용하도록 돕는 연구 학습 플랫폼이다.

**전문가가 사전에 검증한 연구 과정을 하나의 재사용 가능한 디지털 연구 미션으로 만들어 여러 학생에게 제공한다.**

학생은 네 단계를 수행한다.

1. **Understand** — 연구 질문과 데이터를 이해한다.
2. **Reproduce** — 실제 연구의 일부 분석 결과를 재현한다.
3. **Investigate** — 자기 질문으로 데이터를 탐구한다.
4. **Prove** — 처음 보는 데이터에 배운 방법을 적용한다.

모든 단계의 과정과 결과가 기록되며, 학생은 이를 Research Evidence Passport(JSON/HTML/PDF)로 내보낼 수 있다.

## 1.2 핵심 가치 제안

- **For students:** "Do real scientific research without an expensive mentor or laboratory."
- **For schools:** "Run reproducible scientific research activities without designing every project from scratch."
- **For Blue Ocean judges:** "We turn expert-reviewed research guidance from a service delivered one student at a time into a reusable educational product."

## 1.3 제품의 본질

Frontling은 AI 챗봇, 논문 요약 서비스, 논문 작성 도구가 아니다. **검증된 연구 수행 과정을 배포하는 플랫폼이다.** 핵심 가치는 학생이 스스로 연구하도록 돕는 체계가 얼마나 정확하고, 반복 가능하고, 저렴한가에 있다.

## 1.4 결정 사항

- 브랜드: **Frontling Research Missions**
- 초기 사용자: 개별 고등학생(영어). 장기 구매자: 학교·교육기관
- 차별점: Research Mission Pack + Verified Reproduction + Transfer Assessment
- 기본 제품 무료, 프리미엄은 미션 묶음 판매 우선 검토
- 인프라: 정적 웹앱, 브라우저 내 처리, 학생 수행 시 LLM 호출 0회
- 대회 미션: **GISTEMP 2024(대표 데모), Keeling CO₂ 1976 재검증**
- 이번 대회에서 주장하지 않을 것: 검증되지 않은 학습 효과, 유료 구매 의사, 사용자 수, 완전한 부정행위 방지, 도메인 전문가 검토 완료

---

# 2. Problem Definition

## 2.1 핵심 문제

연구에 관심 있는 학생도 연구 질문, 접근 가능한 데이터, 방법론, 분석 환경, 실패했을 때의 도움, 결과 검토 기준이 없으면 실제 연구를 시작하기 어렵다. 전문 연구 멘토나 연구 프로그램에 접근하기 어려운 학생에게 이 문제가 더 크게 작용한다.

## 2.2 연구 근거

- Bell 외(2019)는 미국에서 부모 소득 상위 1% 가정의 자녀가 중위소득 미만 가정의 자녀보다 발명가가 될 확률이 약 10배 높다고 보고했다. 이 격차가 능력 차이만으로 설명되지 않으며, 어린 시절 혁신 활동에 노출되는 경험이 중요하다고 제시한다.
- Bastani 외(2025, PNAS)에서는 안전장치 없는 생성형 AI를 쓴 학생들이 AI 없이 치르는 시험에서 대조군보다 낮은 성과를 보였고, 학습 보호 장치를 넣은 튜터는 그 부정적 영향을 대부분 완화했다.

이 결과가 Frontling의 효과를 직접 입증하지는 않는다. 다만 **정답을 주는 것보다 학생의 독립적 사고를 보호하는 설계가 중요하다**는 가설을 뒷받침한다.

## 2.3 기존 해결 방식의 한계

| 기존 방식 | 장점 | 해결되지 않은 문제 |
|---|---|---|
| 유료 연구 멘토 | 전문적 개별 지도 | 높은 가격, 사람 시간에 따른 확장 한계 |
| 무료 과학 프로젝트 | 높은 접근성 | 논문 재현·독립 평가까지 일관되게 제공하는지는 서비스별 상이 |
| 일반 AI 챗봇 | 즉각적 도움 | 답을 대신 제공할 수 있고 검증되지 않은 안내 가능 |
| AI 연구 가이드 | 연구 계획·단계 안내 | 실제 데이터 분석과 재현 검증은 별도 문제 |
| 기존 온라인 실습 | 체계적 콘텐츠 | 원 논문과 분석 결과의 연결이 제한적일 수 있음 |

목표는 세계 최초 기술의 발명이 아니라, **여러 요소를 새로운 비용 구조와 일관된 연구 과정으로 결합하는 것**이다.

---

# 3. Target Market & Noncustomers

## 3.1 핵심 이용자 — Independent Student Researcher

14~18세. 일반 학교 또는 독립 학습. 일반 노트북과 웹브라우저만 보유. 실제 연구를 하고 싶지만 무엇부터 시작할지 모름. 목표는 논문 출판이 아니라 **실제 연구 방법을 경험하고 독립 분석을 수행하는 것**이다.

## 3.2 핵심 구매자 — Teacher / School Administrator

연구 수업 교사, 과학 동아리 지도 교사, STEM 담당자, 예산·인력이 제한된 학교. 필요한 것은 학생별 멘토가 아니라 재사용 가능한 연구 수업 콘텐츠와 평가 기준이다. **학교의 실제 구매 의사는 아직 검증되지 않았다.**

## 3.3 Three Tiers of Noncustomers

| Tier | 정의 | 전환 가치 |
|---|---|---|
| 1. Soon-to-be | 챗봇·무료 자료로 연구하지만 결과의 정확성을 확인하기 어려운 학생 | 구조화된 미션 + 자동 결과 검증 |
| 2. Refusing | 비용·선발 조건 때문에 유료 연구 프로그램을 이용하지 않는 학생·학교 | 무료·비선발 접근 |
| 3. Unexplored | 연구 전문 교사가 없거나 데이터 연구 수업을 운영해 본 적 없는 학교 | 교사가 과제를 처음부터 만들 필요가 없는 검증된 미션 |

## 3.4 시장 규모 (근거 있는 수치만 사용)

| 구분 | 정의 | 수치 | 근거 |
|---|---|---|---|
| SAM 기준 모집단 | 미국 공립학교 9~12학년 재학생 (2023년 가을) | **약 1,560만 명** | NCES (2024.12 발표) |
| TAM | 전 세계 후기 중등 재학생 | UIS 데이터로 확정 후 기입 | 확인 전 수치 미사용 |
| SOM | 실제 채널로 도달 가능한 초기 시장 | 인터뷰·채널 확보 후 산정 | 미검증 |

매출은 `학생 수 × 결제율 × 구매 빈도 × 가격`으로 분리한 시나리오로만 제시하고, 전 세계 학생 전체를 고객으로 가정하지 않는다.

## 3.5 시장 진입 순서

Phase A(영어 개인 학생 무료 미션) → Phase B(교사·동아리용 미션 묶음) → Phase C(학교 라이선스). **이번 대회는 Phase A의 기술적 완성**이 목표다.

---

# 4. Blue Ocean Value Innovation

## 4.1 새로운 가치

전문가 지식을 미션과 검증 규칙에 미리 반영하고 여러 학생이 반복 사용하게 해서, 사람 중심 연구 지도에서 **콘텐츠·검증 시스템 중심 연구 교육**으로 비용 구조를 바꾼다.

## 4.2 ERRC Grid

| Eliminate | Reduce |
|---|---|
| 필수 1:1 전문 멘토 | 학생당 콘텐츠 제작비 |
| 미션 참여를 위한 선발 | 연구 시작까지의 준비 시간 |
| 학생별 실시간 AI 정답 제공 | 교사의 과제 설계 부담 |
| 필수 유료 분석 도구·계정 | 반복적인 사람 검토 |

| Raise | Create |
|---|---|
| 실제 공개 논문·데이터 활용 | 표준화된 Research Mission Pack |
| 분석 과정의 재현 가능성 | 오류 유형을 진단하는 결정적 검증기 |
| 연구 방법 이해 | 처음 보는 데이터로 하는 Transfer 평가 |
| 과정·출처 투명성 | Research Evidence Passport |

## 4.3 Buyer Utility

| 학생의 작업 | 기존 어려움 | Frontling의 개선 (구현됨) |
|---|---|---|
| 연구 시작 | 논문·주제 선정 | 검토된 미션 선택, 로그인 없음 |
| 데이터 확보 | 자료 검색·정제 | 정제·고정된 공개 데이터(SHA-256 검증) |
| 방법 이해 | 전문 지식 부족 | 개념 퀴즈 + 오류 유형별 승인 힌트 |
| 결과 검증 | 맞게 계산했는지 모름 | 값·분석 조건 동시 검증, 5종 결과 분류 |
| 연구 확장 | 다음 질문 만들기 어려움 | 분석 도구 + 제안 질문 + 보고서 양식 |
| 성과 기록 | 정리에 시간 소요 | Evidence Passport 자동 생성 |

## 4.4 경쟁 우위 가설

미션 팩 형식 자체는 복제 가능하다. 장기 우위는 ① 검토된 미션 라이브러리, ② 검증된 오류 유형·힌트 분기 규칙, ③ 논문별 재현 기준, ④ 반복 배포용 제작·검토 워크플로, ⑤ 실측 품질·경제성 데이터의 **축적**에서 나오도록 설계한다. 현재 확보한 독점 우위가 아니라 앞으로 쌓을 운영상 우위다.

---

# 5. Product Design

## 5.1 UX 원칙

- 가입 없이 첫 연구 시작
- 핵심 자료 사전 준비
- 실시간 생성형 AI가 답을 대신 쓰지 않음
- 제출 시 무엇이 잘못됐는지 이해할 수 있는 피드백
- 진행 상황이 쉽게 사라지지 않음
- 특정 서비스에 종속되지 않는 형식으로 내보내기

## 5.2 사용자 흐름

**Discover → Select → Understand → Reproduce → Investigate → Prove → Export**

| 화면 | 구현 내용 |
|---|---|
| 1. Mission Library | 분야·난이도 필터. 카드에 분야, 원 논문, 소요 시간, 난이도, 선수 지식, 데이터 크기, 환경 요구사항, 검토 상태, 재현 수준·범위 표시 |
| 2. Mission Overview | 연구 질문, 단계별 산출물, **"partial, not full" 재현 범위**, 논문·발표 수치 링크, 데이터 다운로드, 라이선스·검토 범위 |
| 3. Research Workspace | 좌: 안내 / 중: 작업 / 우: 검증·힌트·메모. 900px 이하에서는 탭으로 한 영역만 표시 |
| 4. Research Evidence | 완료 현황, 타임라인, 증거 해시 |
| 5. Export | JSON, HTML, 브라우저 인쇄(PDF) |

단계 잠금: 이전 단계를 완료해야 다음 단계가 열린다(URL로 직접 접근해도 차단).

---

# 6. Core Research Workflow

## Stage 1 — Understand

- **기능:** 논문 소개, 연구 질문, 핵심 개념 용어집, 데이터 구조 설명과 미리보기 표, 개념 퀴즈 4문항, 데이터 구조 확인 1문항, 원 논문 링크
- **완료 조건:** 5문항 모두 정답
- **수용 기준:** 모든 핵심 용어에 설명이 있음 / 오답 시 정답을 노출하지 않는 문항별 피드백 / 무제한 재시도 / 로컬 저장

## Stage 2 — Reproduce

- **기능:** 기준 데이터, 분석 절차, 결과 입력, **분석 조건(단위·기간·기준연도 등) 기록**, 자동 검증, 오류 유형 진단, 승인된 힌트
- **결과 분류:** VALID / OUT_OF_RANGE / FORMAT_ERROR / METHOD_MISMATCH / INCOMPLETE
- **판정 순서:** INCOMPLETE → FORMAT_ERROR → METHOD_MISMATCH → VALID → 진단된 OUT_OF_RANGE → 일반 OUT_OF_RANGE
- **반올림 규칙:** 반올림하지 않은 값끼리 비교해 `|입력 − 기준| ≤ 허용오차`이면 VALID. 과제별 최소 소수 자릿수 미만이면 FORMAT_ERROR(precision). 허용오차는 최소 자릿수의 반올림 오차(0.5×10⁻ᵈ) 이상이어야 한다(자동 검사).
- **수용 기준:** 검증 기준 명시 / 반올림·허용오차 규칙 존재 / 잘못된 분석 조건 감지 / 검증 결과·조건·시각 기록 / "검증 실패는 연구 실패가 아니다" 안내

**한계:** 브라우저 검증기는 학생이 혼자 분석했는지 확인할 수 없다. 검증 범위는 제출 값과 분석 조건의 일관성으로 제한한다.

## Stage 3 — Investigate

- **기능:** 데이터셋·분석(추세/기간 평균/두 기간 평균 차이/최고·최저 연도)·기간 선택, 차트와 추세선, **모든 분석 실행 이력 보존**, 가설 기록, 보고서 제출
- **완료 조건:** 연구 질문, 분석 방법, 실제 결과, 해석, 한계 제출(가설은 선택)
- **수용 기준:** 가설과 결과가 달라도 완료 가능 / 재제출 시 이전 버전을 revisions로 보존 / 한계 기록 필수

## Stage 4 — Prove

- **기능:** 학습 단계와 다른 데이터(GISTEMP → HadCRUT5, 연평균 CO₂ → 월평균 CO₂), 힌트 비활성화, 같은 방법론의 새 적용 과제, **첫 제출을 독립 결과로 별도 기록**, Reproduce와의 성취 비교표, 성찰 질문
- **수용 기준:** Prove 데이터·과제가 학습 단계와 구분됨 / 제품 내 힌트 없음(로더·검사 스크립트 이중 차단) / 평가 기준 사전 정의 / 별도 평가 기록 저장 / 오답 진단 비공개

**한계:** 제품 내부의 도움 없이 수행하는 조건을 제공할 뿐, 외부 AI나 타인의 도움이 없었음을 인증하지 않는다.

---

# 7. Research Mission Pack (RMP)

## 7.1 목적

연구 과제, 데이터, 단계별 학습 내용, 검증 규칙, 힌트, 평가, 출처를 하나의 재사용 데이터 패키지로 만든다. 콘텐츠는 데이터로만 취급하며 실행 코드를 포함하지 않는다.

## 7.2 패키지 구조 (구현됨)

```text
content/missions/<id>/            ← 사람이 작성하는 원본
  mission.json  paper.json  licenses.json
  stages/{understand,reproduce,investigate,prove}.json
  hints/hints.json
  validation/rules.src.json       ← 계산 명세(compute spec)와 오류 시그니처
  review/{checklist,approval}.json
            │  npm run packs (결정적 빌드)
            ▼
public/missions/<id>/             ← 배포되는 RMP
  manifest.json                   ← 전체 파일 SHA-256 + content_hash
  datasets/{reproduce,investigate,transfer}.csv
  validation/rules.json           ← 기준값·시그니처 값이 계산되어 채워짐
  validation/test-cases.json      ← 자동 생성된 오류 탐지 테스트
  (그 외 원본 파일 복사)
```

자체 내부 형식이며 국제 표준이 아니다.

## 7.3 Manifest 필수 필드

mission_id, version, title, subject, difficulty, source_doi, paper_url, dataset_source, dataset_version, license, estimated_duration, prerequisites, reproduction_scope, reproduction_level, validation_version, review_status, review_scope, content_hash, datasets[](id, file, sha256, rows, bytes, frequency, unit, source), files{}(경로별 SHA-256). 누락 시 배포 빌드가 실패한다.

## 7.4 재현 수준

- **R0 — Data Exploration:** 공개 데이터 탐색과 간단한 분석
- **R1 — Partial Reproduction:** 논문 데이터나 결과의 일부 재현
- **R2 — Method Reproduction:** 정의된 범위에서 원 연구 방법을 보다 충실하게 재실행

두 미션 모두 **R1**이며, 재현하지 않는 부분(GISTEMP의 관측소 균질화·공간 보간, Keeling 1976의 당시 보정 체계)을 manifest와 화면에 명시한다.

---

# 8. Answer-Free Hint Engine

## 8.1 정책 (구현됨)

1. 학생이 결과를 한 번 이상 검사하고 VALID가 아니어야 한다.
2. "무엇을 시도했는지"를 20자 이상 작성해야 힌트가 열린다.
3. 힌트는 Direction → Concept → Partial Example 순서로 하나씩 열린다.
4. 경로는 마지막 검증 결과의 진단 코드(예: FAHRENHEIT, FENCEPOST, METHOD_MISMATCH)로 고르고, 전용 힌트가 없으면 generic 경로를 쓴다.
5. Prove 단계에서는 열리지 않으며 VALID 이후에도 열리지 않는다.

## 8.2 분기와 검토

힌트는 실시간 생성하지 않는다. `status: approved`인 힌트만 배포 로더를 통과한다. 배포 게이트는 다음을 자동 검사한다.

- Reproduce 과제마다 generic 경로가 레벨 1·2·3을 모두 가짐
- 모든 진단 코드와 METHOD_MISMATCH에 전용 승인 힌트가 존재
- **정답 노출 검사:** 힌트 문장 속 숫자 토큰이 기준값·발표값의 소수 1~4자리 표현과 같으면 배포 실패
- Prove 과제에 힌트가 있으면 배포 실패

## 8.3 한계

검증값과 힌트는 브라우저로 내려오는 정적 파일이라 개발자 도구로 볼 수 있다. 제품이 부정행위를 완전히 막는다고 주장하지 않는다.

---

# 9. Research Evidence Passport

## 9.1 기록 항목 (구현됨)

미션 ID·버전, 논문 DOI, 검토 상태·범위, 재현 수준·범위, content_hash, 검증 규칙 버전, 데이터 파일별 SHA-256과 브라우저 검증 여부, 단계 완료 현황, 퀴즈 시도, Reproduce 과제별 전체 시도(값·조건·결과·진단·메모)와 사용 힌트, Investigate 분석 실행 이력·최종 보고서·이전 버전, Prove 첫 제출(독립 결과)·전체 시도·성찰, 이벤트 타임라인, 환경 정보, 신뢰 고지, 증거 SHA-256.

## 9.2 내보내기

JSON(기계 판독·재검증용) / HTML(읽기용 보고서, 학생 입력은 모두 이스케이프) / PDF(브라우저 인쇄).

## 9.3 신뢰 수준

Passport는 암호학적으로 보장된 능력 인증서가 아니다. 학생 기기에 저장된 기록은 수정될 수 있다. `evidence_sha256`(전체 필드를 키 정렬 JSON으로 만든 SHA-256)은 **내보낸 뒤 변경되었는지**만 확인해 준다. 기록된 시도는 같은 rules.json으로 다시 검증해 같은 결과가 나오는지 확인할 수 있다(Benchmark D). 공식 인증에는 별도의 검토자 승인과 신뢰 체계가 필요하다.

---

# 10. Mission Authoring & Review System

## 10.1 제작 흐름

**Paper Discovery → Eligibility Screening → AI Draft → Reference Validation → Human Review → Package Build → Release**

- **적격성 제외 조건:** 원본 데이터 접근 불가, 분석 방법 불명확, 검증 기준 생성 불가, 과도한 컴퓨팅 요구, 라이선스 미확인, 학생에게 부적절한 법적·윤리적 위험
- **AI 초안:** 요약, 단계, 선수 지식, 힌트·규칙 초안. AI가 만든 논문 정보·결과값은 신뢰하지 않는다.
- **기준 결과:** 빌드 스크립트가 고정된 데이터에서 계산하고, 별도 구현이 원본 미러 파일에서 다시 계산해 비교한다(Benchmark A).
- **사람 검토:** 연구 질문 타당성, 원 논문과의 일치, 분석 과정, 기준 결과, 힌트 정확성, 난이도, 라이선스·안전

## 10.2 검토 상태

- DRAFT — 초안 (배포 빌드 차단)
- INTERNAL_REVIEWED — 자동 벤치마크 A~D 통과 + 팀 내부 검토 (AI 보조 포함)
- DOMAIN_REVIEWED — 적격 분야 전문가 확인 (`approval.domain_review` 기록 없으면 배포 차단)
- RELEASED — 배포 승인
- DEPRECATED — 사용 중단

## 10.3 검토 비용 최적화

미션과 검증 규칙에 버전을 부여하고 파일별 해시로 변경 부분을 찾아 우선 검토한다. 영향 범위가 불분명하면 전체를 다시 검토한다.

---

# 11. Functional Requirements — 구현 상태

| ID | 요구사항 | 우선순위 | 상태 | 검증 방법 |
|---|---|---|---|---|
| FR-001 | 로그인 없는 미션 시작 | P0 | ✅ | E2E |
| FR-002 | 미션 라이브러리(분야·난이도 필터) | P0 | ✅ | E2E·화면 |
| FR-003 | 4단계 연구 화면·저장 | P0 | ✅ | E2E |
| FR-004 | 로컬 진행 저장·복구 | P0 | ✅ | E2E(새로고침), 단위 |
| FR-005 | 시도 기록 후 힌트 해제 | P0 | ✅ | E2E, Benchmark C |
| FR-006 | 미승인 힌트 배포 차단 | P0 | ✅ | Benchmark C (노출 0건) |
| FR-007 | 분석 결과 검증·오류 유형 반환 | P0 | ✅ | Benchmark B |
| FR-008 | 별도 데이터 평가(Prove) | P0 | ✅ | E2E |
| FR-009 | Evidence JSON | P0 | ✅ | E2E(해시 재계산) |
| FR-010 | HTML/PDF 보고서 | P1 | ✅ | E2E, XSS 단위 테스트 |
| FR-011 | AI 연구 미션 저작 | 기존 | ⏳ | 저작 원본 형식은 확정, 자동 초안 도구는 미구현 |
| FR-012 | 인간 검토 워크플로 | P0 | ✅ | approval·checklist + 배포 게이트 |
| FR-013 | 데이터·라이선스 검사 | P0 | ✅ | 배포 게이트 |
| FR-014 | 미션 버전 관리 | P1 | ✅ | content_hash, 변경 시 화면 경고 |
| FR-015 | 다국어 | P2 | — | 대회 이후 |
| FR-016 | 교사용 대시보드 | P2 | — | 대회 이후 |
| FR-017 | 결제·구독 | P2 | — | 대회 이후 |

---

# 12. Non-Functional Requirements

## 12.1 성능 목표와 실측

기준: 4코어·8GB 노트북. 실측은 `npm run bench`로 재현하며, CPU 4배 감속 에뮬레이션과 로컬 서버를 사용한다(실제 네트워크 지연 제외).

| 항목 | 목표 | 실측 (docs/BENCHMARK.md) |
|---|---|---|
| 정적 앱 초기 로딩 | 5초 이내 | 충족 |
| GISTEMP 데이터 준비(해시 검증 포함) | 10초 이내 | 충족 |
| 단순 수치 검증 | 500ms 이내 | 충족 |
| 진행 저장 | 1초 이내 | 충족 |
| 단계 전환 | 1초 이내 | 충족 |
| 오프라인 재실행 | 자료를 미리 받은 미션 | 데이터 CSV 다운로드 제공. 서비스워커 오프라인 캐시는 대회 이후 |

## 12.2 개인정보

계정 불필요, 이름·이메일 미수집, 모든 기록은 기기 내 localStorage에 저장, 서버 전송 기능 없음, 분석 도구·추적 스크립트 없음. 미성년자 대상 국가별 규정(COPPA 등)은 서버 기능 도입 전에 검토한다.

## 12.3 보안

미션 콘텐츠는 JSON·CSV 데이터로만 읽고 화면에는 텍스트 노드로만 넣는다(HTML 주입 불가). 미션 ID는 `^[a-z0-9-]+$`만 허용, 파일당 5MB 제한, 데이터 SHA-256 검증, 사용자 코드 실행 없음.

## 12.4 접근성

키보드만으로 핵심 흐름 수행(E2E 검증), 건너뛰기 링크, 결과를 색상과 함께 ✓/✗ 기호·텍스트로 표시, aria-live 결과 알림, 모든 입력에 레이블, 44px 이상 터치 영역, 차트에 대체 텍스트.

---

# 13. Technical Architecture

## 13.1 확정 기술 구성

| 구성 | 결정 |
|---|---|
| 프런트엔드 | TypeScript + 자체 경량 DOM 헬퍼 (런타임 의존성 0) |
| 빌드 | Vite 6 |
| 검증 | TypeScript 결정적 분류기 (`src/core/validator.ts`) |
| 미션 저장 | 정적 JSON·CSV |
| 진행 상태 | localStorage (불가 시 경고 표시) |
| 차트 | 자체 SVG 차트 |
| 무결성 | Web Crypto SHA-256 |
| 테스트 | Vitest(단위·벤치마크) + Playwright(E2E) |
| 배포 | GitHub Actions → GitHub Pages (정적) |

## 13.2 구조

```text
data-src/ (고정된 공개 데이터 미러) + content/missions/ (사람이 쓴 원본)
        │  scripts/build-packs.ts   기준값·시그니처 계산, 해시, 테스트 케이스 생성
        ▼
public/missions/<id>/  ──  scripts/check-packs.ts (배포 게이트: 실패 시 빌드 중단)
        │  vite build
        ▼
STATIC HOSTING ──► STUDENT BROWSER
                    ├─ pack loader (해시 검증, 미승인 힌트 제거)
                    ├─ validator (결정적)
                    ├─ hint engine (게이트·분기)
                    └─ local progress ─► Evidence Passport (JSON/HTML/PDF)
```

학생이 미션을 수행할 때 LLM API 비용은 발생하지 않는다. 정적 호스팅에도 전송량 제한과 운영 비용은 있다(16.4 참조).

---

# 14. Mission Catalog

## Mission 001 — Reproduce NASA's 2024 Record (대표 데모)

- **출처:** NASA GISTEMP v4 (Lenssen et al. 2019, doi:10.1029/2018JD029522), 비교 데이터 HadCRUT5
- **데이터:** datasets/global-temp 미러, 커밋 고정, CC-BY-4.0
- **재현:** 2024년 연평균 편차 → 기준값 1.2817 °C, NASA 발표 1.28 °C와 반올림 일치 / 1975~2024 OLS 추세 °C/10년
- **Prove:** 같은 방법을 HadCRUT5에 적용. 기준선이 달라 절대값은 다르지만 추세는 비슷하다는 것을 성찰 질문으로 발견하게 함
- **재현 수준:** R1 · 난이도 Beginner

## Mission 002 — The Keeling Curve: Re-check a 1976 Finding

- **출처:** Keeling et al. 1976, Tellus 28(6) (doi:10.3402/tellusa.v28i6.11322, 오픈 액세스). 초록에 1959~1971 연평균 CO₂ 3.4% 상승 보고
- **데이터:** NOAA GML 마우나로아 연·월평균, datasets/co2-ppm 미러, ODC-PDDL
- **재현:** 현재 NOAA 기록으로 다시 계산하면 3.27%. 논문 값과 0.13%p 차이가 나며, 이 차이를 숨기지 않고 Investigate 질문으로 설명하게 한다. 학생이 논문 값 3.4를 그대로 넣으면 PUBLISHED_VALUE로 진단한다.
- **Prove:** 월평균 자료로 연평균을 직접 만든 뒤 2025 연평균과 1990→2020 상승률 계산
- **재현 수준:** R1 · 난이도 Beginner

## 대회 이후 후보 (P2)

- CIFAR-10-C 강건성 — 브라우저 용량 때문에 사전 계산된 모델 출력 방식으로만 가능
- PTB-XL 심전도 — 의료 데이터 이용 조건과 미성년자 안전 검토 후 결정. 진단 기능은 제공하지 않음

---

# 15. Validation Plan — 실제 사용자 실험 없음

## 15.1 전략

사용자 실험 결과가 없음을 인정하고, 기술적 주장마다 자동으로 다시 실행할 수 있는 시험을 둔다. 모든 결과는 `npm run verify`로 재현한다.

| Benchmark | 내용 | 결과 |
|---|---|---|
| A. 과학적 정확성 | 빌드와 **다른 구현**(Kahan 합, 정규방정식 OLS)이 원본 미러 파일에서 8개 기준값을 재계산(오차 < 10⁻⁶). NASA 1.28 °C 반올림 일치, Keeling 3.4% 대비 편차 < 0.2%p 기록, NOAA 연평균과 월평균 재구성 값 교차 검증 | 11/11 통과 |
| B. 오류 탐지 | 소수점, 단위, 누락, 반대 방향, 기간, 기준값, 순서, 형식 8개 범주를 모두 포함한 자동 생성 케이스 + 경계값 | 123/123 통과 |
| C. 힌트 무결성 | 배포 게이트, 로더 차단, 분기, 게이트 조건, 진단 코드별 힌트 존재 | 6/6 통과, **미승인 힌트 노출 0건** |
| D. 재현성 | 빌드 결정성(content_hash 불변), 배포 데이터로 기준값 재실행, Passport 시도 재검증·위변조 감지 | 3/3 통과 |
| E. 성능·비용 | 크기, 로딩, 검증 지연, 저장, 메모리, 전송량, 호스팅 한도 | 목표 5/5 충족 |
| E2E | 4단계 전체 흐름, 잠금, 모바일 탭, 키보드, 오류 복구, Keeling 진단 | 6/6 통과 |

## 15.2 수요 인터뷰 (신규, 사용자 확보 아님)

- **대상:** 고등학생 10명 이상, 과학·STEM 교사 5명 이상
- **방법:** 15분 화면 공유 데모 후 구조화 질문 5개 (현재 연구 활동 방식, 가장 막히는 지점, 이 제품을 쓸 상황, 학교가 돈을 낼 주체인지, 가장 필요 없는 기능)
- **기록:** 날짜, 역할, 인용문(동의 받은 경우), 행동 신호(링크 요청, 수업 적용 의사 등)를 `docs/INTERVIEWS.md`에 기록
- **사용 원칙:** "N명 중 M명이 ~라고 말했다"처럼 사실로만 발표에 쓴다. 구매 의향이나 학습 효과로 확대 해석하지 않는다.
- **일정:** Sprint 5 (2027.1.16~1.31)

## 15.3 주장하지 않는 것

학생 연구 능력 향상, 학교 구매 의향, 유료 멘토보다 선호, 외부 도움 없이 연구했다는 인증, 기존 교육보다 나은 효과, 도메인 전문가 검토 완료.

---

# 16. Business Model & Unit Economics

## 16.1 개인 상품

- **Free:** 기본 미션, 단계별 힌트, 결과 검증, 로컬 기록, 기본 내보내기
- **Premium Research Packs:** 심화 미션 묶음, 확장 과제. 초기 가격 가설 **묶음당 $5**. 2주짜리 프로젝트에 월 구독은 이탈 위험이 커서 반복 이용이 확인된 뒤 검토한다.

## 16.2 학교 상품 — School Research Library

학급용 미션 묶음, 교사 안내서, 평가 기준, 기록 관리, 업데이트. 가격은 예산 구조와 수요 확인 후 결정한다.

## 16.3 단위 경제성

- 미션당 제작비: **C = AI 제작비 + 인간 검토비 + 기준 결과 검증비 + 유지보수비** (실측은 `docs/COST_LOG.md`에 기록)
- 판매당 공헌이익: **M = 가격 − 결제 수수료 − 추가 전송·지원 비용**
- 회수 판매량: **N = ⌈C / M⌉**

| 변수 | 가정(예시) |
|---|---:|
| 미션 제작·검토비 | $250 |
| 판매 가격 | $5 |
| 판매당 추가 비용 | $0.50 |
| 공헌이익 | $4.50 |
| 회수 판매량 | 56건 |

계산 방식 예시일 뿐 실제 원가·매출이 아니다. 마케팅비, 세금, 고정 인건비는 별도 분석한다.

## 16.4 배포 비용 (실측)

- 학생 1명이 미션 1개를 시작할 때 전송량(gzip): **최대 약 41 KB** (앱 셸 15.7 KB + 미션 팩 최대 25.1 KB)
- 학생 수행 중 LLM 호출: **0회**
- GitHub Pages 월 100GB 소프트 한도 기준 **월 약 240만 회 미션 시작**을 $0 호스팅으로 처리 가능
- Cloudflare Pages 무료 플랜은 정적 대역폭 무제한으로 안내됨

따라서 학생이 늘어날 때 늘어나는 비용은 주로 **콘텐츠 제작·검토와 지원 비용**이며, 이것이 "미션을 반복 사용할수록 학생당 평균 비용이 낮아진다"는 핵심 가설의 근거다. 호스팅·지원·콘텐츠 관리 비용이 0이 된다는 뜻은 아니다.

---

# 17. Go-to-Market

1. **Free Entry:** 계정 없는 무료 미션, 검색 가능한 미션 페이지와 예시 보고서
2. **Educator Distribution:** 교사용 설명서·미션 묶음. 후보 채널: 과학 동아리, STEM 교사 커뮤니티, 학교 연구 프로그램, 공개 교육자료 저장소 (확보·제휴 완료라고 주장하지 않음)
3. **Institutional Sales:** 학교 라이선스·관리 도구 (수요 검증 후)
4. **Global Expansion:** 다국어 미션, 지역 공개 데이터 미션 (라이선스·번역 조건 개별 확인)

---

# 18. Success Metrics

## 18.1 대회 전 측정 지표

| 지표 | 목표 | 현재 |
|---|---|---|
| 검토된 미션 수 | 2개 (v2.0의 3개에서 조정) | 2개 INTERNAL_REVIEWED |
| 4단계 작동 미션 | 최소 1개 | 2개 |
| 기준 테스트 통과율 | 100% | 100% (151/151 단위·벤치마크, 6/6 E2E) |
| 미승인 힌트 노출 | 0건 | 0건 |
| 연구 기록 완전성 | 필수 항목 100% | 100% (E2E 검증) |
| 재현성 | 필수 사례 전부 통과 | 통과 |
| 제작 비용 | 실측값 확보 | ⏳ COST_LOG 기록 필요 |
| 처리 성능 | 목표 충족 | 5/5 충족 |
| 수요 인터뷰 | 15명 이상 | ⏳ 0명 |

## 18.2 대회 이후 지표

미션 시작률, 완수율, 독립 과제 성적, 연구 능력의 사전·사후 변화, 유료 전환율, 학교 재이용률, 학교당 매출, 콘텐츠 제작비 회수 기간 (고객 사용 데이터가 있어야 측정 가능).

---

# 19. Development Roadmap

| Sprint | 기간 | 목표 | 상태 |
|---|---|---|---|
| 1 | 11.15–11.30 | GISTEMP 미션, 검증 엔진, 오류 분류, 분기 힌트, 자동 테스트 | ✅ 11.15 완료 |
| 2 | 12.1–12.15 | Investigate, Prove, Evidence JSON, 로컬 저장 | ✅ 11.15 완료 |
| 3 | 12.16–12.31 | RMP 형식 확정, Keeling 미션, 검토 상태, 라이선스 검사 | ✅ 11.15 완료 |
| 4 | 1.1–1.15 | 정확성·오류·재현성·성능 테스트, 벤치마크 문서 | ✅ 자동화 완료 / ⏳ 실제 저사양 기기 1대 이상 실측 |
| 5 | 1.16–1.31 | **수요 인터뷰 15명+**, 제작비 실측, 경쟁 서비스 조사, ERRC·Strategy Canvas, 비고객 분석 | ⏳ |
| 6 | 2.1–2.10 | **공식 피치 템플릿 순서로** 5분 영어 피치 작성, 시연 녹화, 편집, 과장 표현 점검 | ⏳ |
| 7 | 2.11–2.18 | 전체 QA, **미니 강좌 이수 확인**, 영상 3~5분 확인, YouTube 업로드(#blueoceancompetition), mp4 1GB 미만·제품명 파일명, 제출 | ⏳ |

일정이 앞당겨졌으므로 남는 시간은 **영상 완성도와 인터뷰**에 우선 배정한다(심사 5개 항목 각 20% 중 4개가 피치 내용에 좌우됨).

---

# 20. Risks & Mitigation

| 리스크 | 심각도 | 대응 |
|---|---|---|
| 무료 경쟁 서비스와 차별성 약함 | 높음 | 실제 논문 재현 + 오류 진단 + Transfer 평가 조합을 Strategy Canvas로 비교 |
| 학습 효과 미검증 | 높음 | 효과 주장 금지, 대회 이후 사전·사후 검증 계획 |
| 사람 검토 비용 증가 | 높음 | 미션 재사용, 파일 해시로 변경분 검토 |
| 검증 오류 | 높음 | 독립 구현 교차 검증, 시그니처 간격 자동 검사 |
| 논문·데이터 재사용 제한 | 높음 | 라이선스 기록 없으면 빌드 실패 |
| 외부 AI 사용 | 중간 | 단독 수행 인증으로 오해하지 않도록 화면·Passport에 명시 |
| 브라우저 성능 | 낮음 | 미션당 데이터 100KB 미만, 실측 목표 충족 |
| 자동 저작 품질 | 높음 | DRAFT 배포 차단 |
| 학교 구매 수요 부족 | 높음 | 가격·학교 기능을 검증 전 확정하지 않음, 인터뷰로 신호 확인 |
| 일정 지연 | 중간 | P0 완료. 남은 작업은 피치·인터뷰 중심 |
| localStorage 삭제로 기록 손실 | 중간 | 화면에서 Passport 내보내기 안내, 저장 실패 시 경고 |

---

# 21. Out of Scope (대회 전)

실시간 AI 채팅, 전 분야 자동 미션 생성, 논문 자동 작성·게재, 학생 소셜 네트워크, 실시간 공동 연구, 학교 학생 관리 시스템, AI 부정행위 완전 탐지, 의료 분석·진단, 모든 연구 방법의 브라우저 실행, 공식 학력 인증, 서버 저장·계정.

---

# 22. Blue Ocean Competition Strategy

## 22.1 공식 요건 (blueoceancompetition.org/submit)

- 마감 2027.2.21 23:59 (현지 시각), 영상 **3~5분** (벗어나면 실격)
- 대회 등록, **온라인 미니 강좌 이수**, **공식 피치 템플릿** 사용, Blue Ocean 도구 활용
- YouTube 업로드(#blueoceancompetition) + 영상 파일 제출(mp4 등, 1GB 미만, 제품명으로 파일명)
- 심사: 가치 혁신 / 영향력 / 기술적 실현 가능성 / 사업성·확장성 / 발표·도구 활용, **각 20%**, 1~5점

## 22.2 심사 항목별 증거 배치

| 심사 항목 | 화면에 보여줄 증거 |
|---|---|
| 가치 혁신 | ERRC Grid, Strategy Canvas(가치 곡선이 갈라지는 지점 강조) |
| 영향력 | 비고객 3계층, Bell 외 노출 격차, NCES 1,560만 명 |
| 기술적 실현 가능성 | 실제 시연: NASA 1.28 °C 재현 → 오류 진단·힌트 → HadCRUT5 Transfer → Passport. "151 tests, 0 unapproved hints" |
| 사업성·확장성 | 학생당 41 KB, LLM 0회, 월 240만 회를 $0 호스팅, 수요 인터뷰 결과(사실 그대로) |
| 발표·도구 활용 | 공식 템플릿 순서, Buyer Utility Map, 열정적인 전달 |

## 22.3 Strategy Canvas 비교 요소

가격 접근성, 실시간 인간 멘토링, 데이터의 실제성, 논문 재현 지원, 결과 검증, 새 데이터 적용 평가, 학생별 제공 비용, 연구 과정 기록. 경쟁사 점수는 공식 자료로 확인한 기능만 근거로 매기고, 근거가 없으면 비워 둔다.

## 22.4 피치 구성 (공식 템플릿 확인 후 순서 재배치)

| 시간 | 내용 |
|---|---|
| 0:00–0:35 | 한 학생의 이야기로 연구 기회 불평등 제시 |
| 0:35–1:05 | 기존 해결책의 비용 구조 한계 |
| 1:05–2:10 | 실제 시연 (GISTEMP) |
| 2:10–3:05 | ERRC·비고객·Strategy Canvas |
| 3:05–4:05 | 검증 결과와 단위 경제성 |
| 4:05–4:45 | 시장 진입·확장 |
| 4:45–5:00 | 비전 |

## 22.5 핵심 메시지

> The next great scientist may not have a laboratory. They may not have a mentor. But they may have a laptop.
> Frontling turns real scientific research into guided, reproducible missions that students can complete themselves.
> We are not replacing the thinking. We are removing the barriers that prevent students from starting.

---

# 23. Final Release Gates

| Gate | 항목 | 상태 |
|---|---|---|
| 1. Technology | 대표 미션 4단계 작동, 기준값 검증, 오류 사례 통과, 조건 기록, Passport 생성 | ✅ |
| 2. Scientific Trust | 출처 확인, 재현 범위 명시, 힌트 검토, 검토자·범위 공개, 재현성 테스트 | ✅ (도메인 전문가 검토는 미주장) |
| 3. Blue Ocean | 경쟁 제품 차별성 확인, 차별화-저비용 논리, 비고객 3계층, ERRC, Strategy Canvas | 🔶 ERRC·비고객 완료 / 경쟁 조사·Canvas 미완 |
| 4. Business | 제작비 실측, 가격 가설, 무료 범위, 학교 진입 계획, 시장·매출 가정 분리 | 🔶 배포비 실측 완료 / 제작비 실측·인터뷰 미완 |
| 5. Pitch | 3~5분, 영어, 실제 구현 사용, 미검증 주장은 가설 표시, 공식 절차 완료 | ⏳ |

모든 Gate 통과를 '대회 제출 준비 완료'로 정의한다. 수상을 보증하는 기준이 아니라 중요한 약점이 확인되지 않은 채 제출되는 것을 막는 내부 기준이다.

---

# 24. 최종 성공 정의

- **Competition:** Blue Ocean 2027 세계 종합 1위 (목표이며 예측 아님)
- **Product:** 멘토 없는 학생에게 실제 공개 논문 기반의 정확하고 재현 가능한 연구 경험 제공
- **Business:** 검증된 미션의 반복 제공으로 연구 교육 콘텐츠의 평균 제공 비용을 낮추고 지속 가능한 경제성 확보
- **Long-Term:** 연구 교육 접근성이 학교, 가정 소득, 멘토 유무에 지나치게 좌우되지 않게 함

# 25. Final Product Statement

**Frontling Research Missions — The Research Lab Without the Lab.**

Frontling transforms real scientific research into reusable, expert-reviewed learning missions. Students reproduce published findings, investigate new questions, and document their work without relying on expensive individual mentorship or AI-generated answers. By separating expert content creation from student delivery, Frontling aims to make authentic, data-driven research education more accessible and economically scalable.

**Real Science. Real Evidence. No Answers Handed to You.**

---

# References

1. Bell, A., Chetty, R., Jaravel, X., Petkova, N., & Van Reenen, J. (2019). Who Becomes an Inventor in America? The Importance of Exposure to Innovation. https://www.nber.org/papers/w24062
2. Bastani, H. et al. (2025). Generative AI without guardrails can harm learning. PNAS. https://doi.org/10.1073/pnas.2422633122
3. Lenssen, N. et al. (2019). Improvements in the GISTEMP Uncertainty Model. JGR Atmospheres 124(12), 6307–6326. https://doi.org/10.1029/2018JD029522
4. NASA. Global Temperature — Earth Indicator (2024: 1.28 °C above 1951–1980). https://science.nasa.gov/earth/explore/earth-indicators/global-temperature/
5. Keeling, C. D. et al. (1976). Atmospheric carbon dioxide variations at Mauna Loa Observatory, Hawaii. Tellus 28(6), 538–551. https://doi.org/10.3402/tellusa.v28i6.11322
6. datasets/global-temp (GISTEMP v4, HadCRUT5; CC-BY-4.0). https://github.com/datasets/global-temp
7. datasets/co2-ppm (NOAA GML; ODC-PDDL-1.0). https://github.com/datasets/co2-ppm
8. NCES (2024). Public school enrollment fall 2023: grades 9–12 = 15.6 million. https://nces.ed.gov/learn/press-release/nces-data-show-public-school-enrollment-held-steady-overall-fall-2022-fall-2023
9. GitHub Pages limits (100 GB/month soft bandwidth). https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
10. Cloudflare Pages plans (unlimited static bandwidth). https://pages.cloudflare.com/
11. Blue Ocean Competition — Scoring Criteria. https://blueoceancompetition.org/scoring-criteria/
12. Blue Ocean Competition — Submit Your Pitch. https://blueoceancompetition.org/submit/
13. Blue Ocean Tools and Templates. https://blueoceancompetition.org/blue-ocean-tools-templates/
14. Polygence, PolyPilot. https://www.polygence.org/preview/polypilot
15. Science Buddies, High School Data Science Projects. https://www.sciencebuddies.org/science-fair-projects/science-projects/big-data/high-school
16. OpenAlex, Open Access and Licensing. https://help.openalex.org/data/works/open-access/

**End of PRD v2.1**
