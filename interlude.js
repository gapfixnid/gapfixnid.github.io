const story = window.UNNAMED_STORY;

const interlude_data = {
  interlude_001: {
    chapter: "막간",
    location: "기억의 파편",
    title: "잊어버린 흉터",
    text: [
      "첫 번째 생존의 문턱을 넘은 후, 전투의 피로가 몰려오자 너는 잠시 눈을 감았다.",
      "네가 잃어버린 수많은 기억 중 유독 하나의 감정만이 흉터처럼 선명하게 남아있었다. 그것은 무엇인가?"
    ],
    choices: [
      { 
        label: "불타버린 고향의 재 냄새", 
        effects: { flags: ["past_hometown"], stats: { memory: 1 } }, 
        next: "act2_001" 
      },
      { 
        label: "나를 사지로 몰아넣은 지휘관의 웃음", 
        effects: { flags: ["past_betrayal"], stats: { doubt: 1 } }, 
        next: "act2_001" 
      },
      { 
        label: "지키지 못한 동생의 차가운 손", 
        effects: { flags: ["past_family"], stats: { wound: 1, faith: 1 } }, 
        next: "act2_001" 
      }
    ]
  }
};

Object.assign(story.events, interlude_data);
