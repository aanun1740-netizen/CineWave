const messages = {
  hy: {
    empty: () => "Ավելացրու առնվազն մեկ սերիայի հղում։",
    limit: () => "Մեկ սերիալի համար կարող ես ավելացնել մինչև 200 սերիա։",
    format: ({ line }) => `Տող ${line}․ գրիր սեզոնն ու սերիան 1/1 ձևաչափով, հետո ավելացրու հղումը։`,
    missingLink: ({ number }) => `Ավելացրու ${number} սերիայի հղումը։`,
    playlist: ({ number }) => `${number}․ սա փլեյլիստի հղում է։ Տեղադրիր հենց սերիայի հղումը։`,
    link: ({ number }) => `${number}․ հղումը չի ճանաչվել։ Տեղադրիր աջակցվող HTTPS հղումը կամ փլեյերի ամբողջ iframe կոդը։`,
    duplicateNumber: ({ number, line, firstLine }) => `${number} համարը կրկնվում է ${firstLine} և ${line} տողերում։`,
    duplicateLink: ({ number, firstNumber }) => `${firstNumber} և ${number} սերիաների հղումները նույնն են։ Ուղղիր նշված հղումը։`,
    numberMismatch: ({ number }) => `${number}․ NextEmbed-ի հղման սեզոնը կամ սերիան չի համընկնում գրված համարին։`,
  },
  ru: {
    empty: () => "Добавьте ссылку хотя бы на одну серию.",
    limit: () => "В одном сериале может быть до 200 серий.",
    format: ({ line }) => `Строка ${line}. Введите сезон и серию в формате 1/1, затем ссылку.`,
    missingLink: ({ number }) => `Добавьте ссылку на серию ${number}.`,
    playlist: ({ number }) => `${number}. Это ссылка на плейлист. Вставьте ссылку на саму серию.`,
    link: ({ number }) => `${number}. Ссылка не распознана. Вставьте поддерживаемую HTTPS-ссылку или полный iframe плеера.`,
    duplicateNumber: ({ number, line, firstLine }) => `Номер ${number} повторяется в строках ${firstLine} и ${line}.`,
    duplicateLink: ({ number, firstNumber }) => `У серий ${firstNumber} и ${number} одинаковая ссылка. Исправьте выделенную ссылку.`,
    numberMismatch: ({ number }) => `${number}. Сезон или серия в ссылке NextEmbed не совпадает с указанным номером.`,
  },
  en: {
    empty: () => "Add a link for at least one episode.",
    limit: () => "A series can have up to 200 episodes.",
    format: ({ line }) => `Line ${line}. Enter the season and episode as 1/1, followed by a link.`,
    missingLink: ({ number }) => `Add a link for episode ${number}.`,
    playlist: ({ number }) => `${number}. This is a playlist link. Paste the link to the episode itself.`,
    link: ({ number }) => `${number}. This link was not recognized. Paste a supported HTTPS link or the full player iframe.`,
    duplicateNumber: ({ number, line, firstLine }) => `Episode ${number} appears twice, on lines ${firstLine} and ${line}.`,
    duplicateLink: ({ number, firstNumber }) => `Episodes ${firstNumber} and ${number} use the same link. Correct the highlighted link.`,
    numberMismatch: ({ number }) => `${number}. The NextEmbed link does not match the entered season and episode.`,
  },
};

export function cleanSeriesErrorMessage(language, error) {
  return (messages[language] || messages.en)[error.code](error);
}
