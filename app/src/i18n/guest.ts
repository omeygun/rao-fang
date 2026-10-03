// Guest-facing strings (spec §6.2). Consent text version is stored with each consent record.
import type { GuestLang } from '../config/aspects';

export const GUEST_CONSENT_VERSION = 'guest-v1';

export const G: Record<GuestLang, {
  langName: string;
  consentTitle: string;
  consentBody: string[];
  agree: string;
  skip: string;
  rateTitle: string;
  rateHint: string;
  steps: Record<string, string>;
  skipStep: string;
  like: string;
  dislike: string;
  openTitle: string;
  openHint: string;
  record: string;
  stop: string;
  transcribing: string;
  editHint: string;
  placeholder: string;
  voiceUnavailable: string;
  submit: string;
  thanks: string;
  thanksBody: string;
  done: string;
  back: string;
}> = {
  en: {
    langName: 'English',
    consentTitle: 'Before you start',
    consentBody: [
      'Your host would like to learn from your visit. We will ask you to rate a few photos and, if you like, tell us what would make the tour better.',
      'What we collect: your ratings and your written or spoken answer (as text). Voice recordings are turned into text on this phone and are not kept.',
      'Everything stays on this phone. Nothing is sent over the internet.',
      'It is anonymous: we do not ask for your name or contact details.',
      'You can skip any question, or skip feedback entirely.',
    ],
    agree: 'I agree',
    skip: 'Skip feedback',
    rateTitle: 'How was each part?',
    rateHint: 'Tap 👍 or 👎, or skip.',
    steps: { walk: 'Walk through the farm', picking: 'Picking coffee cherries', processing: 'Processing & roasting', tasting: 'Coffee tasting', host: 'Our hosts' },
    skipStep: 'Skip',
    like: 'I liked it',
    dislike: 'I did not like it',
    openTitle: 'What would make this better? Anything you would buy?',
    openHint: 'Speak or type. You can edit the text before sending.',
    record: '🎤 Speak',
    stop: '⏹ Stop',
    transcribing: 'Turning speech into text on this phone…',
    editHint: 'Check and edit the text if needed:',
    placeholder: 'Type here…',
    voiceUnavailable: 'Voice input is not available. Please type instead.',
    submit: 'Send',
    thanks: 'Thank you!',
    thanksBody: 'Your feedback is saved on this phone. Please hand the phone back to your host.',
    done: 'Done',
    back: 'Back',
  },
  zh: {
    langName: '中文',
    consentTitle: '开始之前',
    consentBody: [
      '主人希望从您的参观中学习改进。我们会请您为几张照片打分，如果愿意，也可以告诉我们怎样让这次体验更好。',
      '我们收集的内容：您的评分，以及您写下或说出的回答（转成文字）。语音只在这部手机上转成文字，不会保存录音。',
      '所有内容只保存在这部手机上，不会通过网络发送。',
      '完全匿名：我们不会询问您的姓名或联系方式。',
      '您可以跳过任何问题，也可以完全不填写。',
    ],
    agree: '我同意',
    skip: '跳过反馈',
    rateTitle: '每个环节感觉如何？',
    rateHint: '点 👍 或 👎，也可以跳过。',
    steps: { walk: '农场徒步', picking: '采摘咖啡果', processing: '咖啡加工与烘焙', tasting: '咖啡品尝', host: '主人的招待' },
    skipStep: '跳过',
    like: '喜欢',
    dislike: '不喜欢',
    openTitle: '怎样能让体验更好？有没有想买的东西？',
    openHint: '可以说话或打字。发送前可以修改文字。',
    record: '🎤 说话',
    stop: '⏹ 停止',
    transcribing: '正在这部手机上把语音转成文字…',
    editHint: '请检查并修改文字：',
    placeholder: '在这里输入…',
    voiceUnavailable: '语音输入不可用，请打字。',
    submit: '发送',
    thanks: '谢谢您！',
    thanksBody: '您的反馈已保存在这部手机上。请把手机交还给主人。',
    done: '完成',
    back: '返回',
  },
  ko: {
    langName: '한국어',
    consentTitle: '시작하기 전에',
    consentBody: [
      '호스트가 이번 방문에서 배우고 싶어 합니다. 사진 몇 장에 평가를 해 주시고, 원하시면 투어를 더 좋게 만들 방법을 알려 주세요.',
      '수집하는 내용: 평가와 글이나 말로 남긴 답변(텍스트). 음성은 이 휴대폰에서 텍스트로 바뀌며 녹음은 저장되지 않습니다.',
      '모든 내용은 이 휴대폰에만 저장되며 인터넷으로 전송되지 않습니다.',
      '익명입니다: 이름이나 연락처를 묻지 않습니다.',
      '어떤 질문이든 건너뛰거나 피드백 전체를 건너뛸 수 있습니다.',
    ],
    agree: '동의합니다',
    skip: '피드백 건너뛰기',
    rateTitle: '각 순서는 어떠셨나요?',
    rateHint: '👍 또는 👎를 누르거나 건너뛰세요.',
    steps: { walk: '농장 산책', picking: '커피 열매 따기', processing: '가공과 로스팅', tasting: '커피 시음', host: '호스트의 환대' },
    skipStep: '건너뛰기',
    like: '좋았어요',
    dislike: '별로였어요',
    openTitle: '무엇이 더 좋아지면 좋을까요? 사고 싶은 것이 있나요?',
    openHint: '말하거나 입력하세요. 보내기 전에 텍스트를 고칠 수 있습니다.',
    record: '🎤 말하기',
    stop: '⏹ 멈추기',
    transcribing: '이 휴대폰에서 음성을 텍스트로 바꾸는 중…',
    editHint: '텍스트를 확인하고 필요하면 고쳐 주세요:',
    placeholder: '여기에 입력하세요…',
    voiceUnavailable: '음성 입력을 사용할 수 없습니다. 입력해 주세요.',
    submit: '보내기',
    thanks: '감사합니다!',
    thanksBody: '피드백이 이 휴대폰에 저장되었습니다. 휴대폰을 호스트에게 돌려주세요.',
    done: '완료',
    back: '뒤로',
  },
};
