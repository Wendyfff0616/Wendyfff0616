const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// 配置
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'Wendyfff0616';
const README_PATH = path.join(__dirname, '..', 'README.md');
const MAX_ISSUES = 10; // 显示最多 10 个最新 Issues

// 初始化 Octokit
const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

async function getMyIssues() {
  try {
    console.log(`Fetching issues for user: ${GITHUB_USERNAME}`);
    
    // 使用 GitHub Search API 获取用户创建的 Issues
    const searchQuery = `author:${GITHUB_USERNAME} is:issue`;
    const response = await octokit.rest.search.issuesAndPullRequests({
      q: searchQuery,
      sort: 'created',
      order: 'desc',
      per_page: MAX_ISSUES,
    });

    console.log(`Found ${response.data.total_count} total issues`);
    return response.data.items;
  } catch (error) {
    console.error('Error fetching issues:', error.message);
    return [];
  }
}

function formatIssuesList(issues) {
  if (issues.length === 0) {
    return '*No public issues found or issues are loading...*';
  }

  let content = '';
  
  // 添加统计信息
  const openIssues = issues.filter(issue => issue.state === 'open').length;
  const closedIssues = issues.filter(issue => issue.state === 'closed').length;
  
  content += `📊 **Recent Issues Statistics**: ${openIssues} Open • ${closedIssues} Closed\n\n`;
  
  // 添加 Issues 列表
  issues.forEach((issue, index) => {
    const emoji = issue.state === 'open' ? '🟢' : '🔴';
    const repo = issue.repository_url.split('/').slice(-2).join('/');
    const date = new Date(issue.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    content += `${index + 1}. ${emoji} **[${issue.title}](${issue.html_url})**\n`;
    content += `   📂 ${repo} • 📅 ${date}`;
    
    // 添加标签
    if (issue.labels && issue.labels.length > 0) {
      const labelNames = issue.labels.slice(0, 3).map(label => `\`${label.name}\``).join(' ');
      content += ` • 🏷️ ${labelNames}`;
    }
    
    content += '\n\n';
  });

  return content;
}

async function updateReadme(issuesContent) {
  try {
    const readmeContent = fs.readFileSync(README_PATH, 'utf8');
    
    // 查找并替换 Issues 列表部分
    const startMarker = '<!-- ISSUES-LIST:START -->';
    const endMarker = '<!-- ISSUES-LIST:END -->';
    
    const startIndex = readmeContent.indexOf(startMarker);
    const endIndex = readmeContent.indexOf(endMarker);
    
    if (startIndex === -1 || endIndex === -1) {
      console.error('Could not find ISSUES-LIST markers in README.md');
      return false;
    }
    
    const beforeContent = readmeContent.substring(0, startIndex + startMarker.length);
    const afterContent = readmeContent.substring(endIndex);
    
    const newContent = `${beforeContent}\n${issuesContent}\n${afterContent}`;
    
    // 只有内容真的改变时才写入文件
    if (newContent !== readmeContent) {
      fs.writeFileSync(README_PATH, newContent, 'utf8');
      console.log('README.md updated successfully');
      return true;
    } else {
      console.log('No changes needed');
      return false;
    }
  } catch (error) {
    console.error('Error updating README:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Issues list update...');
    
    // 获取 Issues
    const issues = await getMyIssues();
    
    // 格式化内容
    const issuesContent = formatIssuesList(issues);
    
    // 更新 README
    const updated = await updateReadme(issuesContent);
    
    if (updated) {
      console.log('✅ Issues list updated successfully!');
    } else {
      console.log('ℹ️ No updates needed');
    }
    
  } catch (error) {
    console.error('❌ Error in main process:', error.message);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { getMyIssues, formatIssuesList, updateReadme }; 