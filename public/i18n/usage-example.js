
// ===== i18n 使用範例 =====
// 建立翻譯器
async function createI18n(locale = 'zh-TW') {
  const response = await fetch('/i18n/' + locale + '.json');
  const translations = await response.json();
  
  return {
    t: (key, params = {}) => {
      const keys = key.split('.');
      let value = translations;
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) return key;
      }
      if (typeof value === 'function') {
        return value(...Object.values(params));
      }
      return value;
    },
    locale: locale,
    setLocale: async (newLocale) => {
      const response = await fetch('/i18n/' + newLocale + '.json');
      Object.assign(translations, await response.json());
      return locale = newLocale;
    }
  };
}

// 使用範例:
// const i18n = await createI18n('zh-TW');
// console.log(i18n.t('navigation.home'));  // '最新一集'
// console.log(i18n.t('podcast.episodeNumber', { ep: 680 }));  // 'EP680'
// console.log(i18n.t('analysis.question1'));  // '本集的核心投資命題與市場背景是什麼？'
//
// await i18n.setLocale('en-US');
// console.log(i11n.t('navigation.home'));  // 'Latest Episode'
