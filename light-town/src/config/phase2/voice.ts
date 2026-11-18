/**
 * 第二阶段中文语音：教学与操作提示。每个中文 item 的读音不在这里——
 * 它们由 content.json 的 zh 项（voiceText）生成，文件名 phase2/voice/<item.id>.m4a。
 * 每行都有屏幕文字，语音不可用时游戏照常可玩。
 */
export const VOICE_LINES_P2 = {
  p2Intro1: '坐稳，让双手回到键盘中间。',
  p2Intro2: '英文切英文输入，中文选择系统拼音输入法，家长可帮助设置。',
  p2Intro3: '照着目标输入，选字后再确认。',
  p2Select: '输入拼音，选出目标汉字，再点确认。',
  p2Paging: '如果没有看到目标字，使用输入法候选栏的翻页按钮。',
  p2Polyphone: '同一个字在不同词里读音可能不同，看看上面的拼音。',
  p2Umlaut: '常见全拼用 v 输入 ü，例如绿灯可试 lv deng；按输入法选出目标字词。',
  p2Uppercase: '按住 Shift，再按字母键。',
  p2Question: '在常见英文键盘上按住 Shift，再按问号键。',
  p2Period: '输入英文句号。',
  p2Space: '两个单词之间按一次空格。',
  p2Wrong: '再看一眼标出的地方，改好后确认。',
  p2ConfirmIme: '选好字后，点确认。',
  p2Paste: '检测到粘贴，请用键盘输入。粘贴不计入错误。',
  p2ExitIme: '还没选定的拼音不会保存。先选好字，或退出后重新输入。',
  p2Rest: '已经练习一会儿了，休息一下吧。进度会保存。',
} as const;

export type P2VoiceId = keyof typeof VOICE_LINES_P2;
