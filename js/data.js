/* ==========================================================================
   Oxford Reading Tree 단어놀이 - 데이터 정의
   ------------------------------------------------------------------------
   구조: 레벨(Level) > 유닛(Unit, 예: "1. First Sentence") > 책(Book, 예:
   "Big Feet") > 그 책에 나오는 단어/표현 카드들.

   책 한 권의 그림카드는 한 장의 이미지 안에 여러 칸(2~3열 x 3~4행)이
   격자로 들어있고, 각 칸에는 그림 + 영어 텍스트가 이미 그려져 있습니다.
   화면에 낱장 카드로 보여줄 때는 이미지를 다시 자르지 않고, CSS 배경
   스프라이트 기법(background-size / background-position)으로 한 칸만
   잘라서 보여줍니다. (app.js 의 spriteStyle 참고)

   각 시트 이미지의 칸 경계는 사진마다 미묘하게 다르기 때문에(카드 사이
   여백이 균일하지 않음), 균등 분할로 자르면 옆 카드 테두리가 섞여 보이는
   문제가 있었습니다. 그래서 각 시트 이미지를 분석해 카드별 정확한 픽셀
   좌표([x, y, w, h], 왼쪽→오른쪽·위→아래 순서)를 미리 계산해 아래
   CARD_BOXES 에 넣어뒀습니다.
   ========================================================================== */

const CARD_BOXES = {
  'Big Feet.png': { w: 1024, h: 1536, boxes: [[16,13,490,498], [507,9,498,507], [16,516,489,497], [511,516,489,497], [16,1019,490,498], [506,1013,500,509]] },
  'Go Away, Floppy.png': { w: 1024, h: 1536, boxes: [[28,34,478,494], [506,28,490,506], [38,547,457,472], [522,547,457,472], [28,1022,478,494], [509,1019,484,500]] },
  'Hide and Seek.png': { w: 1024, h: 1536, boxes: [[39,23,463,378], [502,14,483,395], [39,419,463,378], [506,414,475,388], [61,802,419,342], [534,802,419,342], [39,1147,463,378], [508,1144,471,385]] },
  "Kippers's Diary.png": { w: 1024, h: 1536, boxes: [[14,19,329,384], [343,19,329,384], [672,15,335,391], [14,410,329,384], [343,410,329,384], [675,410,329,384], [32,794,293,342], [361,794,293,342], [693,794,293,342], [14,1137,329,384], [343,1137,329,384], [673,1136,332,387]] },
  'Look at Me.png': { w: 1024, h: 1536, boxes: [[27,26,480,496], [507,20,491,507], [31,529,471,486], [517,529,471,486], [27,1019,480,496], [508,1015,488,504]] },
  'Reds and Blues.png': { w: 1024, h: 1536, boxes: [[30,11,476,501], [508,9,481,506], [30,518,476,501], [508,515,481,507], [30,1025,476,501], [508,1022,481,507]] },
  'Go Away, Cat.png': { w: 1024, h: 1536, boxes: [[29,22,481,498], [511,19,487,504], [39,523,461,477], [524,523,461,477], [29,1006,481,498], [510,1001,490,507]] },
  'Go On, Mum!.png': { w: 1024, h: 1536, boxes: [[42,24,462,486], [504,16,478,503], [42,525,462,486], [506,519,474,499], [277,1018,465,489]] },
  'Look After Me.png': { w: 1024, h: 1536, boxes: [[18,19,486,491], [504,12,500,505], [19,520,485,490], [511,520,485,490], [18,1010,486,491], [511,1010,486,491]] },
  'Present for Dad.png': { w: 1254, h: 1254, boxes: [[16,10,403,408], [419,8,407,412], [826,8,407,412], [24,420,387,392], [429,420,387,392], [836,420,387,392], [16,816,403,408], [419,814,407,412], [826,814,407,412]] },
  'Top Dog.png': { w: 1024, h: 1536, boxes: [[16,23,491,494], [507,18,500,504], [16,530,491,494], [510,529,493,497], [17,1026,488,491], [512,1026,488,491]] },
  'What Dogs Like.png': { w: 1024, h: 1536, boxes: [[10,23,494,488], [504,18,504,498], [14,525,486,480], [513,525,486,480], [10,1007,494,488], [506,1005,499,493]] },
};

// 레벨별 색상 테마 (전통적인 리딩 스킴 스테이지 컬러밴드에서 영감을 받은
// 오리지널 팔레트입니다)
const LEVEL_THEME_COLORS = {
  level1: { main: '#ef476f', soft: '#ffe3ea', name: 'Pink' },
  level2: { main: '#e63946', soft: '#ffe1e1', name: 'Red' },
  level3: { main: '#ffb703', soft: '#fff4d6', name: 'Yellow' },
  level4: { main: '#4cc9f0', soft: '#dff6ff', name: 'Blue' },
  level5: { main: '#2a9d8f', soft: '#dcf5f1', name: 'Green' },
  level6: { main: '#f4772e', soft: '#ffe9db', name: 'Orange' },
  level7: { main: '#4dd6c4', soft: '#dbf9f4', name: 'Turquoise' },
  level8: { main: '#9b5de5', soft: '#f0e4fb', name: 'Purple' },
  level9: { main: '#c98a3d', soft: '#f6e9d8', name: 'Gold' },
};

/**
 * 책 한 권을 정의합니다. words 는 [영어, 한글 뜻] 쌍의 배열이며, 시트
 * 이미지에서 왼쪽→오른쪽·위→아래 순서와 반드시 일치해야 합니다.
 */
function defineBook({ id, title, file, words }) {
  const boxInfo = CARD_BOXES[file];
  if (!boxInfo) {
    console.warn(`[data] ${file} 의 카드 좌표(CARD_BOXES)가 없어요.`);
    return { id, title, file, items: [] };
  }
  if (words.length !== boxInfo.boxes.length) {
    console.warn(`[data] ${file} 의 단어 개수(${words.length})가 카드 개수(${boxInfo.boxes.length})와 다릅니다.`);
  }
  const items = words.map(([word, ko], i) => {
    const [x, y, w, h] = boxInfo.boxes[i];
    return {
      id: `${id}-${i}`,
      word,
      ko,
      sheet: { file, x, y, w, h, sheetW: boxInfo.w, sheetH: boxInfo.h, aspect: w / h },
    };
  });
  return { id, title, file, items };
}

const UNIT1_BOOKS = [
  defineBook({
    id: 'hide-and-seek',
    title: 'Hide and Seek',
    file: 'Hide and Seek.png',
    words: [
      ['hide', '숨다'], ['seek', '찾다'],
      ['see', '보다'], ['all', '모두'],
      ['yes', '네'], ['hide and seek', '숨바꼭질'],
      ['can', '~할 수 있다'], ["can't", '~할 수 없다'],
    ],
  }),
  defineBook({
    id: 'look-at-me',
    title: 'Look at Me',
    file: 'Look at Me.png',
    words: [
      ['look', '보다'], ['bike', '자전거'],
      ['mum', '엄마'], ['ride', '타다'],
      ['on', '~위에'], ['look at', '~을 보다'],
    ],
  }),
  defineBook({
    id: 'go-away-floppy',
    title: 'Go Away, Floppy',
    file: 'Go Away, Floppy.png',
    words: [
      ['skip', '깡충깡충 뛰다'], ['paint', '그림을 그리다'],
      ['sorry', '미안해'], ['back', '뒤로, 등'],
      ['go away', '저리 가'], ['come back', '돌아오다'],
    ],
  }),
  defineBook({
    id: 'reds-and-blues',
    title: 'Reds and Blues',
    file: 'Reds and Blues.png',
    words: [
      ['red', '빨간색'], ['blue', '파란색'],
      ['muddy', '진흙투성이의'], ['team', '팀'],
      ['in', '~안에'], ['come on', '자, 어서'],
    ],
  }),
  defineBook({
    id: 'big-feet',
    title: 'Big Feet',
    file: 'Big Feet.png',
    words: [
      ['big', '큰'], ['feet', '발'],
      ['monster', '괴물'], ['dinosaur', '공룡'],
      ['giant', '거인'], ['dad', '아빠'],
    ],
  }),
  defineBook({
    id: 'kippers-diary',
    title: "Kipper's Diary",
    file: "Kippers's Diary.png",
    words: [
      ['diary', '일기장'], ['wet', '젖은'], ['windy', '바람이 부는'],
      ['sunny', '화창한'], ['hot', '더운'], ['fun', '재미있는'],
      ['shop', '가게'], ['pool', '수영장'], ['park', '공원'],
      ['day', '하루, 날'], ['go', '가다'], ['to', '~으로'],
    ],
  }),
];

const UNIT2_BOOKS = [
  defineBook({
    id: 'what-dogs-like',
    title: 'What Dogs Like',
    file: 'What Dogs Like.png',
    words: [
      ['dog', '개'], ['play', '놀다'],
      ['walk', '걷다, 산책시키다'], ['sleep', '자다'],
      ['run', '달리다'], ['hate', '싫어하다'],
    ],
  }),
  defineBook({
    id: 'present-for-dad',
    title: 'Present for Dad',
    file: 'Present for Dad.png',
    words: [
      ['present', '선물'], ['bunch', '(꽃) 다발'], ['flower', '꽃'],
      ['chocolate', '초콜릿'], ['grape', '포도'], ['best', '최고의'],
      ['for', '~을 위해'], ['box', '상자'], ['best of all', '무엇보다도 최고인'],
    ],
  }),
  defineBook({
    id: 'top-dog',
    title: 'Top Dog',
    file: 'Top Dog.png',
    words: [
      ['little', '작은'], ['big', '큰'],
      ['top', '최고, 꼭대기'], ['best', '최고의'],
      ['dog', '개'], ['best of all', '무엇보다도 최고인'],
    ],
  }),
  defineBook({
    id: 'look-after-me',
    title: 'Look After Me',
    file: 'Look After Me.png',
    words: [
      ['net', '그물, 네트'], ['slide', '미끄럼틀'],
      ['ladder', '사다리'], ['go up', '올라가다'],
      ['look after', '~을 돌보다'], ['go on', '계속하다, 어서 해'],
    ],
  }),
  defineBook({
    id: 'go-on-mum',
    title: 'Go On, Mum!',
    file: 'Go On, Mum!.png',
    words: [
      ['mum', '엄마'], ['again', '다시'],
      ['not', '아니다, ~않다'], ['go on', '계속하다, 어서 해'],
      ['not again', '또 안돼, 다시는 안돼'],
    ],
  }),
  defineBook({
    id: 'go-away-cat',
    title: 'Go Away, Cat',
    file: 'Go Away, Cat.png',
    words: [
      ['cat', '고양이'], ['dog', '개'],
      ['little', '작은'], ['big', '큰'],
      ['come', '오다'], ['go away', '저리 가'],
    ],
  }),
];

// 레벨 1 유닛 목록. "1. First Sentence", "2. More First Sentences A" 만
// 책이 채워져 있고 나머지는 "준비중" 상태입니다. 새 유닛/책을 추가하려면
// Level1/ 아래 해당 유닛 폴더에 그림카드 이미지를 넣고 이 배열에
// 등록하면 됩니다.
const LEVEL1_UNITS = [
  { id: 'u1', label: '1. First Sentence', dirName: '1.First Sentence', books: UNIT1_BOOKS },
  { id: 'u2', label: '2. More First Sentences A', dirName: '2.More First Sentences A', books: UNIT2_BOOKS },
  { id: 'u3', label: '3. More First Sentences B', dirName: '3.More First Sentences B', books: [] },
  { id: 'u4', label: '4. Patterned Stories', dirName: '4.Patterned Stories', books: [] },
  { id: 'u5', label: '5. More Patterned Stories', dirName: '5.More Patterned Stories', books: [] },
  { id: 'u6', label: '6. Decode and Develop', dirName: '6.Decode and Develop', books: [] },
];

// 레벨 목록. Level1 만 데이터가 채워져 있고 나머지는 "준비중" 상태입니다.
const LEVELS = [
  { id: 'level1', label: 'Level 1', dirName: 'Level1', units: LEVEL1_UNITS },
  { id: 'level2', label: 'Level 2', dirName: 'Level2', units: [] },
  { id: 'level3', label: 'Level 3', dirName: 'Level3', units: [] },
  { id: 'level4', label: 'Level 4', dirName: 'Level4', units: [] },
  { id: 'level5', label: 'Level 5', dirName: 'Level5', units: [] },
  { id: 'level6', label: 'Level 6', dirName: 'Level6', units: [] },
  { id: 'level7', label: 'Level 7', dirName: 'Level7', units: [] },
  { id: 'level8', label: 'Level 8', dirName: 'Level8', units: [] },
  { id: 'level9', label: 'Level 9', dirName: 'Level9', units: [] },
];
