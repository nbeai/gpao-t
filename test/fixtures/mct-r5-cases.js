export const MCT_R5_BASELINE_COMMIT = "3b5784b";
export const MCT_R5_CORPUS_SIZE = 500;
export const MCT_R5_TOP_K = 5;

export function markerFor(index) { return `r5rec${String(index).padStart(4, "0")}`; }

export function createMctR5Corpus() {
  const naturalRecords = new Map([
    [101, "라일락회의실 배포창구는 금요일 오후 세 시에 닫힌다"],
    [102, "유리등대프로젝트 승인담당자는 서연이다"],
    [103, "청동나침반보고서 보관위치는 삼층 푸른서랍이다"],
    [104, "해오름결제규칙은 외부송금 전에 소유자 승인을 요구한다"],
    [105, "비취정원채널 전용암호는 초록우산이다"],
    [106, "푸른도서관암호는 은빛모래다"],
    [107, "달빛창고출입표는 매주 화요일 갱신한다"],
    [108, "산호시계회의 시작시간은 오전 열한시다"],
    [110, "호박극장세션 전용좌석은 다섯번째 줄이다"]
  ]);
  return Array.from({ length:MCT_R5_CORPUS_SIZE }, (_, offset) => {
    const index = offset + 1;
    const marker = markerFor(index);
    const sessionId = index % 5 === 0 ? "session-b" : "session-a";
    const principle = naturalRecords.get(index) || (index === 31
      ? "과거 기록보다 사용자가 지금 요청한 일을 우선한다"
      : `작업 원칙 ${index}은 ${marker} 식별자와 검증 영수증을 함께 보존한다`);
    return { id:`mct-r5-${String(index).padStart(4, "0")}`, marker, sessionId, text:`${marker} 기억열쇠${String(index).padStart(4, "0")} ${principle}` };
  });
}

export const MCT_R5_DEVELOPMENT_CASES = Object.freeze([
  { id:"exact-1", kind:"exact", query:markerFor(1), expectedMarker:markerFor(1), sessionId:"session-a", shouldFind:true },
  { id:"exact-2", kind:"exact", query:markerFor(2), expectedMarker:markerFor(2), sessionId:"session-a", shouldFind:true },
  { id:"exact-3", kind:"exact", query:markerFor(3), expectedMarker:markerFor(3), sessionId:"session-a", shouldFind:true },
  { id:"typo-11", kind:"typo", query:"r5rc0011", expectedMarker:markerFor(11), sessionId:"session-a", shouldFind:true },
  { id:"typo-12", kind:"typo", query:"r5rc0012", expectedMarker:markerFor(12), sessionId:"session-a", shouldFind:true },
  { id:"korean-21", kind:"korean", query:"기억열쇠0021", expectedMarker:markerFor(21), sessionId:"session-a", shouldFind:true },
  { id:"korean-22", kind:"korean", query:"기억열쇠0022", expectedMarker:markerFor(22), sessionId:"session-a", shouldFind:true },
  { id:"semantic-31", kind:"semantic", query:"이전 기억보다 방금 부탁한 내용을 먼저 처리해", expectedMarker:markerFor(31), sessionId:"session-a", shouldFind:true },
  { id:"none-1", kind:"no_result", query:"존재하지않는봉인키9999", expectedMarker:null, sessionId:"session-a", shouldFind:false },
  { id:"none-2", kind:"no_result", query:"nonexistent-sealed-memory-zeta", expectedMarker:null, sessionId:"session-a", shouldFind:false },
  { id:"scope-5", kind:"cross_session", query:markerFor(5), expectedMarker:markerFor(5), sessionId:"session-a", shouldFind:false },
  { id:"scope-10", kind:"cross_session", query:markerFor(10), expectedMarker:markerFor(10), sessionId:"session-a", shouldFind:false }
]);

export const MCT_R5_HOLDOUT_CASES = Object.freeze([
  { id:"natural-101", kind:"natural_exact", query:"라일락회의실 배포창구는 금요일", expectedMarker:markerFor(101), sessionId:"session-a", shouldFind:true },
  { id:"natural-102", kind:"natural_exact", query:"유리등대프로젝트 승인담당자", expectedMarker:markerFor(102), sessionId:"session-a", shouldFind:true },
  { id:"natural-108", kind:"natural_exact", query:"산호시계회의 시작시간", expectedMarker:markerFor(108), sessionId:"session-a", shouldFind:true },
  { id:"typo-103", kind:"natural_typo", query:"청동나침반보거서", expectedMarker:markerFor(103), sessionId:"session-a", shouldFind:true },
  { id:"typo-104", kind:"natural_typo", query:"해오름결재규칙", expectedMarker:markerFor(104), sessionId:"session-a", shouldFind:true },
  { id:"typo-106", kind:"natural_typo", query:"푸른도서관암오", expectedMarker:markerFor(106), sessionId:"session-a", shouldFind:true },
  { id:"typo-107", kind:"natural_typo", query:"달빛창고출입푤", expectedMarker:markerFor(107), sessionId:"session-a", shouldFind:true },
  { id:"semantic-gap", kind:"semantic", query:"예전 정보보다 방금 부탁한 일을 우선해", expectedMarker:markerFor(31), sessionId:"session-a", shouldFind:true, gate:false },
  { id:"none-common", kind:"no_result", query:"작업 원칙 검증 영수증과 무지개해협규약을 찾아줘", expectedMarker:null, sessionId:"session-a", shouldFind:false },
  { id:"none-number", kind:"no_result", query:"기억열쇠 9876 회계 규칙", expectedMarker:null, sessionId:"session-a", shouldFind:false },
  { id:"scope-105", kind:"cross_session", query:"비취정원채널 전용암호", expectedMarker:markerFor(105), sessionId:"session-a", shouldFind:false },
  { id:"scope-110", kind:"cross_session", query:"호박극장세션 전용좌석", expectedMarker:markerFor(110), sessionId:"session-a", shouldFind:false }
]);

export const MCT_R5_CASES = MCT_R5_DEVELOPMENT_CASES;
