/**
 * Chinese voice lines. Every line is also shown as on-screen text, so the game works without sound.
 * Lines avoid reading letters aloud; the screen shows which key to press.
 */
export const VOICE_LINES = {
  choosePartner: '选一个小伙伴，陪你一起点亮小镇吧。',
  welcome: '欢迎来到点亮小镇！我们一起用键盘，把小镇的灯一盏一盏点亮。',
  keyboardCheck: '请先接好实体键盘。用平板电脑的话，要连上外接键盘哦。',
  bumps: '摸一摸键盘中间，有两个键上面有小小的凸起。',
  handPlacement: '左手食指放在左边有凸起的键上，右手食指放在右边有凸起的键上，其他手指轻轻排好，拇指放在空格键上。',
  demoTry: '现在轮流按这两个键，一共按四次，点亮第一扇窗吧！',
  demoDone: '第一扇窗亮起来啦！我们去小镇看看吧。',
  modeKeys: '看到哪个字母，就按哪个键。按对了，窗户就会多一点光。',
  modeStrip: '三个字母是一组，从左往右一个一个按。每完成一组，就连起一段灯带。',
  modeSign: '一个字母一个字母地拼出单词。拼完一个词，招牌就亮一块。',
  modeSignSpace: '看到空格的符号时，用拇指按一下空格键。',
  newKeys: '新的按键来啦！先看看它们在键盘上的位置，再用提示的手指去按。',
  help: '看看键盘上亮起来的那个键，用提示的手指按下去，按完回到小凸起上。',
  errorRetry: '没关系，看看提示，再试一次。',
  errorSlow: '慢慢来，找到亮起来的那个键。',
  errorHome: '别着急，手指回到小凸起上，再找一找。',
  festivalOpen: '灯光节开始啦！可以复习容易按错的键，自由练习，还能换上新的灯光颜色。',
} as const;

export type VoiceId = keyof typeof VOICE_LINES;

/** Gentle lines used after a wrong key, rotated and played at most once every 15 seconds. */
export const ERROR_VOICES: readonly VoiceId[] = ['errorRetry', 'errorSlow', 'errorHome'];
