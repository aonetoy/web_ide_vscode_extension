import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
	console.log('start');

	// rule.txt파일 읽고 줄바꿈 기준으로 분할
	const dirPath = path.resolve(`${__dirname}`, '../rule.txt');
	const rule = fs.readFileSync(dirPath, 'utf-8');
	let rule_split = rule.split('\r\n');

	// 0번째 줄 정규표현식으로 만들기(pattern과 option)
	let rule0 = rule_split[0];
	let rule0_split = rule0.split('/');
	let pat = rule0_split[1];
	let opt = rule0_split[2];
	let rule0_regex = new RegExp(pat, opt);

	// rule1(암호 알고리즘) 텍스트 비교
	let rule1 = rule_split[1].split(', ');

	// rule2(위험 함수들) 정규표현식으로 표현한 함수
	let rule2_split = rule_split[2].split(' ::: ');
	let rule2_common_reg = rule2_split[1];
	let rule2 = rule2_split[0].split(', ');
	let rule2_regex: any[] = [];
	for(let i=0;i<rule2.length;i++){
		rule2[i] = rule2[i]+rule2_common_reg;
		rule2_regex[i] = new RegExp(rule2[i]);
	}

	// code 읽어서 입력한 rule값과 비교, TestPattern Command 입력했을 때
	let TestPattern = vscode.commands.registerCommand('TestPattern', () => {
		const currentTextEditor = vscode.window.activeTextEditor;
		if (!currentTextEditor) {
			return;
		}
		// 지정 범위 저장
		const currentTextDocument = currentTextEditor.document;
		const selections = currentTextEditor.selections;
		const selectionRange = new vscode.Range(
			selections[0].start,
			selections[0].end,
		);
		const lineAndChar: any = [];
		let rule0_line: number[] = [];
		let rule0_cnt = 0;
		let rule2_line: any[] = [];
		let rule2_cnt = 0;
		// selection line number 저장
		const lineNumbers: number[] = [];
		const toGetLineNumber: number = selections[0].end.line - selections[0].start.line + 1;
		for (let i = 0; i < toGetLineNumber; i++) {
			lineNumbers.push(selections[0].start.line + i);
		}
		// 라인별 문자열 분해 후 매칭되면 인덱스, 라인넘버, rule 저장
		let lines = currentTextDocument.getText(selectionRange).split("\n");
		for (let i = 0; i < lines.length; i++) { // 전체 라인별

			// rule0 확인
			const regextest = lines[i].match(rule0_regex);
			if(regextest !== null){
				rule0_line.push(i+1);
				rule0_cnt++;
			}

			// rule2 확인
			for(let k=0;k<rule2_regex.length;k++){
				const regextest = lines[i].match(rule2_regex[k]);
				if(regextest !== null){
					rule2_line.push({
						line: i+1,
						rule: rule2_regex[k],
					});
					rule2_cnt++;
				}
			}

			for (let j = 0; j < lines[i].length;) { // 라인의 문자열별
				// rule1 확인
				for (let k = 0; k < rule1.length; k++) {
					const char = lines[i].indexOf(rule1[k], j);
					if (char > -1) {
						lineAndChar.push({
							line: lineNumbers[i],
							rule: rule1[k],
						});
						j = char + 1;
					} else {
						j++;
					}
				}
			}
		}

		// 출력부
		async function output() {
			let content = '';
			for(let i=0; i<rule0_cnt; i++){
				content = content + (rule0_line[i] + '번째 줄에 정규표현식에 해당하는 문장 존재(rule0)\n');
			}
			for (let i = 0; i < lineAndChar.length; i++) {
				content = content + (lineAndChar[i].line + 1 + '줄의 ' + lineAndChar[i].rule + ' rule1\n');
			}
			for(let i=0; i<rule2_cnt; i++){
				content = content + (rule2_line[i].line + '줄의' + rule2_line[i].rule + ' rule2\n');
			}
			const document = await vscode.workspace.openTextDocument({
				content,
			});
			vscode.window.showTextDocument(document);
		}
		output();
	});
}
