const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// 配置
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'Wendyfff0616';
const README_PATH = path.join(__dirname, '..', 'README.md');
const MAX_ISSUES_PER_CATEGORY = 5; // 每个分类显示最多 5 个 Issues

// 初始化 Octokit
const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

async function getIssuesByCategory() {
  try {
    console.log(`Fetching issues for user: ${GITHUB_USERNAME}`);
    
    const categories = {
      assigned: {
        title: 'Assigned to Me',
        emoji: '👤',
        query: `assignee:${GITHUB_USERNAME} is:issue`,
        issues: []
      },
      created: {
        title: 'Created by Me',
        emoji: '✨',
        query: `author:${GITHUB_USERNAME} is:issue`,
        issues: []
      },
      mentioned: {
        title: 'Mentioned',
        emoji: '@',
        query: `mentions:${GITHUB_USERNAME} is:issue`,
        issues: []
      },
      recent: {
        title: 'Recent Activity',
        emoji: '🕒',
        query: `involves:${GITHUB_USERNAME} is:issue`,
        issues: []
      }
    };

    // 获取每个分类的 Issues
    for (const [key, category] of Object.entries(categories)) {
      try {
        const response = await octokit.rest.search.issuesAndPullRequests({
          q: category.query,
          sort: key === 'recent' ? 'updated' : 'created',
          order: 'desc',
          per_page: MAX_ISSUES_PER_CATEGORY,
        });

        category.issues = response.data.items;
        console.log(`Found ${response.data.total_count} ${category.title.toLowerCase()}`);
      } catch (error) {
        console.error(`Error fetching ${category.title}:`, error.message);
        category.issues = [];
      }
    }

    return categories;
  } catch (error) {
    console.error('Error in getIssuesByCategory:', error.message);
    return {};
  }
}

function formatIssuesContent(categories) {
  if (!categories || Object.keys(categories).length === 0) {
    return '*No issues found or issues are loading...*';
  }

  let content = '';
  
  // 添加总体统计
  let totalIssues = 0;
  let totalOpen = 0;
  let totalClosed = 0;
  
  Object.values(categories).forEach(category => {
    totalIssues += category.issues.length;
    totalOpen += category.issues.filter(issue => issue.state === 'open').length;
    totalClosed += category.issues.filter(issue => issue.state === 'closed').length;
  });
  
  content += `📊 **Issues Overview**: ${totalOpen} Open • ${totalClosed} Closed • ${totalIssues} Total\n\n`;
  
  // 为每个分类添加内容
  Object.entries(categories).forEach(([key, category]) => {
    if (category.issues.length > 0) {
      content += `## ${category.emoji} ${category.title}\n\n`;
      
      category.issues.forEach((issue, index) => {
        const emoji = issue.state === 'open' ? '🟢' : '🔴';
        const repo = issue.repository_url.split('/').slice(-2).join('/');
        const date = new Date(issue.updated_at).toLocaleDateString('en-US', {
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
      
      content += '---\n\n';
    } else {
      content += `## ${category.emoji} ${category.title}\n\n`;
      content += `*No ${category.title.toLowerCase()} found*\n\n`;
      content += '---\n\n';
    }
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
    console.log('🚀 Starting comprehensive Issues list update...');
    
    // 获取所有分类的 Issues
    const categories = await getIssuesByCategory();
    
    // 格式化内容
    const issuesContent = formatIssuesContent(categories);
    
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

module.exports = { getIssuesByCategory, formatIssuesContent, updateReadme }; 