export interface PronunciationLesson {
  id: number;
  category: 'consonant';
  sound: string;
  title: string;
  guidance: string;
  examples: string;
}

export const pronunciationLessons: PronunciationLesson[] = [
  { id: 1, category: 'consonant', sound: '/p/ và /b/', title: 'Âm bật môi', guidance: 'Khép hai môi rồi bật hơi ra. Với /b/, dây thanh rung; với /p/, dây thanh không rung.', examples: 'pat – bat; pear – bear; cap – cab' },
  { id: 2, category: 'consonant', sound: '/θ/ và /ð/', title: 'Âm đầu lưỡi', guidance: 'Đặt nhẹ đầu lưỡi giữa hai hàm răng và thổi hơi. Với /ð/, thêm rung dây thanh.', examples: 'think; three; this; those' },
  { id: 3, category: 'consonant', sound: '/s/ và /ʃ/', title: 'Phân biệt âm xát', guidance: 'Với /s/, hướng hơi qua khe hẹp gần răng. Với /ʃ/, đưa lưỡi lùi nhẹ và tròn môi.', examples: 'sip – ship; see – she; sell – shell' },
  { id: 4, category: 'consonant', sound: '/l/ và /r/', title: 'Vị trí đầu lưỡi', guidance: 'Với /l/, đầu lưỡi chạm lợi phía sau răng trên. Với /r/ tiếng Anh, đầu lưỡi không chạm lợi.', examples: 'light – right; led – red; long – wrong' },
];
