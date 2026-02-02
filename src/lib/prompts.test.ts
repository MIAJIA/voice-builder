import { describe, it, expect } from 'vitest';
import {
  buildPlatformTransformPrompt,
  buildCoThinkSystemPrompt,
  PLATFORM_NAMES,
  PLATFORM_DEFAULTS,
  AUDIENCE_LABELS,
  AUDIENCE_DESCRIPTIONS,
  ANGLE_LABELS,
  ANGLE_DESCRIPTIONS,
} from './prompts';

describe('buildPlatformTransformPrompt', () => {
  describe('Platform-specific content', () => {
    it('should include Twitter platform name for twitter', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null);
      expect(prompt).toContain('Twitter');
    });

    it('should include 小红书 platform name for xiaohongshu', () => {
      const prompt = buildPlatformTransformPrompt('xiaohongshu', null);
      expect(prompt).toContain('小红书');
    });

    it('should include 朋友圈 platform name for wechat', () => {
      const prompt = buildPlatformTransformPrompt('wechat', null);
      expect(prompt).toContain('朋友圈');
    });

    it('should include LinkedIn platform name for linkedin', () => {
      const prompt = buildPlatformTransformPrompt('linkedin', null);
      expect(prompt).toContain('LinkedIn');
    });

    it('should include platform-specific tone for twitter', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null);
      expect(prompt).toContain(PLATFORM_DEFAULTS.twitter.tone);
    });

    it('should include platform-specific style for xiaohongshu', () => {
      const prompt = buildPlatformTransformPrompt('xiaohongshu', null);
      expect(prompt).toContain(PLATFORM_DEFAULTS.xiaohongshu.style);
    });
  });

  describe('Length instructions', () => {
    describe('concise length', () => {
      it('should include concise instructions for twitter', () => {
        const prompt = buildPlatformTransformPrompt('twitter', null, 'concise');
        expect(prompt).toContain('长度要求：简洁');
        expect(prompt).toContain('只输出 1 个版本');
        expect(prompt).toContain('100字/50词以内');
        expect(prompt).toContain('硬性要求');
      });

      it('should include concise instructions for xiaohongshu', () => {
        const prompt = buildPlatformTransformPrompt('xiaohongshu', null, 'concise');
        expect(prompt).toContain('长度要求：简洁');
        expect(prompt).toContain('200字以内');
      });

      it('should include concise instructions for linkedin', () => {
        const prompt = buildPlatformTransformPrompt('linkedin', null, 'concise');
        expect(prompt).toContain('长度要求：简洁');
        expect(prompt).toContain('200字以内');
      });

      it('should include concise instructions for wechat', () => {
        const prompt = buildPlatformTransformPrompt('wechat', null, 'concise');
        expect(prompt).toContain('长度要求：简洁');
        expect(prompt).toContain('100字以内');
      });
    });

    describe('normal length', () => {
      it('should include normal length instructions', () => {
        const prompt = buildPlatformTransformPrompt('twitter', null, 'normal');
        expect(prompt).toContain('长度要求：正常');
        expect(prompt).toContain('2-3 个不同角度的版本');
      });

      it('should include platform-specific normal length for twitter', () => {
        const prompt = buildPlatformTransformPrompt('twitter', null, 'normal');
        expect(prompt).toContain(PLATFORM_DEFAULTS.twitter.length);
      });
    });

    describe('detailed length', () => {
      it('should include detailed length instructions', () => {
        const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'auto', 'peers', 'sharing');
        const detailedPrompt = buildPlatformTransformPrompt('twitter', null, 'detailed');
        expect(detailedPrompt).toContain('长度要求：详细');
        expect(detailedPrompt).toContain('充分展开');
      });

      it('should include thread format for twitter detailed', () => {
        const prompt = buildPlatformTransformPrompt('twitter', null, 'detailed');
        expect(prompt).toContain('1/ 2/ 3/');
      });

      it('should include segment format for xiaohongshu detailed', () => {
        const prompt = buildPlatformTransformPrompt('xiaohongshu', null, 'detailed');
        expect(prompt).toContain('分段清晰');
      });
    });
  });

  describe('Language instructions', () => {
    it('should include Chinese language instruction for zh', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'zh');
      expect(prompt).toContain('语言要求：中文');
      expect(prompt).toContain('必须用中文输出');
    });

    it('should include English language instruction for en', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'en');
      expect(prompt).toContain('语言要求：英文');
      expect(prompt).toContain('必须用英文输出');
    });

    it('should include auto language instruction for auto', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'auto');
      expect(prompt).toContain('语言要求：自动');
      expect(prompt).toContain('根据平台习惯选择语言');
    });
  });

  describe('Audience instructions', () => {
    it('should include peers audience instruction', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'auto', 'peers');
      expect(prompt).toContain(`目标受众：${AUDIENCE_LABELS.peers}`);
      expect(prompt).toContain(AUDIENCE_DESCRIPTIONS.peers);
    });

    it('should include beginners audience instruction', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'auto', 'beginners');
      expect(prompt).toContain(`目标受众：${AUDIENCE_LABELS.beginners}`);
      expect(prompt).toContain(AUDIENCE_DESCRIPTIONS.beginners);
    });

    it('should include leadership audience instruction', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'auto', 'leadership');
      expect(prompt).toContain(`目标受众：${AUDIENCE_LABELS.leadership}`);
      expect(prompt).toContain(AUDIENCE_DESCRIPTIONS.leadership);
    });

    it('should include friends audience instruction', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'auto', 'friends');
      expect(prompt).toContain(`目标受众：${AUDIENCE_LABELS.friends}`);
      expect(prompt).toContain(AUDIENCE_DESCRIPTIONS.friends);
    });
  });

  describe('Angle instructions', () => {
    it('should include sharing angle instruction', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'auto', 'peers', 'sharing');
      expect(prompt).toContain(`内容角度：${ANGLE_LABELS.sharing}`);
      expect(prompt).toContain(ANGLE_DESCRIPTIONS.sharing);
    });

    it('should include asking angle instruction', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'auto', 'peers', 'asking');
      expect(prompt).toContain(`内容角度：${ANGLE_LABELS.asking}`);
      expect(prompt).toContain(ANGLE_DESCRIPTIONS.asking);
    });

    it('should include opinion angle instruction', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'auto', 'peers', 'opinion');
      expect(prompt).toContain(`内容角度：${ANGLE_LABELS.opinion}`);
      expect(prompt).toContain(ANGLE_DESCRIPTIONS.opinion);
    });

    it('should include casual angle instruction', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'auto', 'peers', 'casual');
      expect(prompt).toContain(`内容角度：${ANGLE_LABELS.casual}`);
      expect(prompt).toContain(ANGLE_DESCRIPTIONS.casual);
    });

    it('should include roast angle instruction', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'auto', 'peers', 'roast');
      expect(prompt).toContain(`内容角度：${ANGLE_LABELS.roast}`);
      expect(prompt).toContain(ANGLE_DESCRIPTIONS.roast);
    });

    it('should include teaching angle instruction', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'auto', 'peers', 'teaching');
      expect(prompt).toContain(`内容角度：${ANGLE_LABELS.teaching}`);
      expect(prompt).toContain(ANGLE_DESCRIPTIONS.teaching);
    });

    it('should include story angle instruction', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'auto', 'peers', 'story');
      expect(prompt).toContain(`内容角度：${ANGLE_LABELS.story}`);
      expect(prompt).toContain(ANGLE_DESCRIPTIONS.story);
    });
  });

  describe('Persona handling', () => {
    it('should not include persona section when persona is null', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null);
      expect(prompt).not.toContain('用户人设（优先级最高）');
    });

    it('should not include persona section when persona is not custom', () => {
      const prompt = buildPlatformTransformPrompt('twitter', {
        platformBio: 'test bio',
        tone: 'test tone',
        styleNotes: 'test style',
        isCustom: false,
      });
      expect(prompt).not.toContain('用户人设（优先级最高）');
    });

    it('should include persona section when persona is custom', () => {
      const prompt = buildPlatformTransformPrompt('twitter', {
        platformBio: 'My Twitter persona',
        tone: 'witty and sharp',
        styleNotes: 'Use metaphors',
        isCustom: true,
      });
      expect(prompt).toContain('用户人设（优先级最高）');
      expect(prompt).toContain('My Twitter persona');
      expect(prompt).toContain('witty and sharp');
      expect(prompt).toContain('Use metaphors');
    });
  });

  describe('Combined configurations', () => {
    it('should correctly combine twitter + concise + zh + beginners + asking', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'concise', 'zh', 'beginners', 'asking');

      // Platform
      expect(prompt).toContain('Twitter');
      // Length
      expect(prompt).toContain('长度要求：简洁');
      expect(prompt).toContain('100字/50词以内');
      expect(prompt).toContain('硬性要求');
      // Language
      expect(prompt).toContain('必须用中文输出');
      // Audience
      expect(prompt).toContain(AUDIENCE_LABELS.beginners);
      expect(prompt).toContain(AUDIENCE_DESCRIPTIONS.beginners);
      // Angle
      expect(prompt).toContain(ANGLE_LABELS.asking);
      expect(prompt).toContain(ANGLE_DESCRIPTIONS.asking);
    });

    it('should correctly combine linkedin + detailed + en + leadership + opinion', () => {
      const prompt = buildPlatformTransformPrompt('linkedin', null, 'detailed', 'en', 'leadership', 'opinion');

      // Platform
      expect(prompt).toContain('LinkedIn');
      // Length
      expect(prompt).toContain('长度要求：详细');
      // Language
      expect(prompt).toContain('必须用英文输出');
      // Audience
      expect(prompt).toContain(AUDIENCE_LABELS.leadership);
      expect(prompt).toContain(AUDIENCE_DESCRIPTIONS.leadership);
      // Angle
      expect(prompt).toContain(ANGLE_LABELS.opinion);
      expect(prompt).toContain(ANGLE_DESCRIPTIONS.opinion);
    });

    it('should correctly combine xiaohongshu + normal + zh + friends + casual', () => {
      const prompt = buildPlatformTransformPrompt('xiaohongshu', null, 'normal', 'zh', 'friends', 'casual');

      // Platform
      expect(prompt).toContain('小红书');
      // Length
      expect(prompt).toContain('长度要求：正常');
      // Language
      expect(prompt).toContain('必须用中文输出');
      // Audience
      expect(prompt).toContain(AUDIENCE_LABELS.friends);
      // Angle
      expect(prompt).toContain(ANGLE_LABELS.casual);
    });

    it('should correctly combine wechat + concise + auto + peers + sharing', () => {
      const prompt = buildPlatformTransformPrompt('wechat', null, 'concise', 'auto', 'peers', 'sharing');

      // Platform
      expect(prompt).toContain('朋友圈');
      // Length
      expect(prompt).toContain('长度要求：简洁');
      expect(prompt).toContain('100字以内');
      expect(prompt).toContain('硬性要求');
      // Language
      expect(prompt).toContain('语言要求：自动');
      // Audience
      expect(prompt).toContain(AUDIENCE_LABELS.peers);
      // Angle
      expect(prompt).toContain(ANGLE_LABELS.sharing);
    });
  });

  describe('Prompt structure validation', () => {
    it('should have audience section before angle section', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'auto', 'peers', 'sharing');
      const audienceIndex = prompt.indexOf('目标受众');
      const angleIndex = prompt.indexOf('内容角度');
      expect(audienceIndex).toBeLessThan(angleIndex);
    });

    it('should have length section before language section', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null, 'normal', 'en');
      const lengthIndex = prompt.indexOf('长度要求');
      const languageIndex = prompt.indexOf('语言要求');
      expect(lengthIndex).toBeLessThan(languageIndex);
    });

    it('should end with user content placeholder', () => {
      const prompt = buildPlatformTransformPrompt('twitter', null);
      expect(prompt.trim()).toMatch(/用户内容\s*$/);
    });
  });
});

describe('buildCoThinkSystemPrompt', () => {
  it('should include interviewer role description', () => {
    const prompt = buildCoThinkSystemPrompt(null);
    expect(prompt).toContain('采访者');
    expect(prompt).toContain('不是代笔');
  });

  it('should include default profile section when profile is null', () => {
    const prompt = buildCoThinkSystemPrompt(null);
    expect(prompt).toContain('用户尚未设置个人资料');
  });

  it('should include profile details when profile is provided', () => {
    const prompt = buildCoThinkSystemPrompt({
      bio: 'Product manager who loves simplicity',
      tone: 'casual',
      avoidWords: ['赋能', '抓手'],
      interests: ['技术', '产品'],
      platformPersonas: {},
    });
    expect(prompt).toContain('Product manager who loves simplicity');
    expect(prompt).toContain('轻松随意');
    expect(prompt).toContain('赋能');
    expect(prompt).toContain('抓手');
    expect(prompt).toContain('技术');
    expect(prompt).toContain('产品');
  });

  it('should include interview stages', () => {
    const prompt = buildCoThinkSystemPrompt(null);
    expect(prompt).toContain('阶段 1');
    expect(prompt).toContain('阶段 2');
    expect(prompt).toContain('阶段 3');
    expect(prompt).toContain('阶段 4');
  });

  it('should include perfectionism reminder guidelines', () => {
    const prompt = buildCoThinkSystemPrompt(null);
    expect(prompt).toContain('学习者视角');
    expect(prompt).toContain('不完美的想法也值得分享');
  });
});

describe('Constants validation', () => {
  it('should have all platform names defined', () => {
    expect(PLATFORM_NAMES.twitter).toBe('Twitter');
    expect(PLATFORM_NAMES.xiaohongshu).toBe('小红书');
    expect(PLATFORM_NAMES.wechat).toBe('朋友圈');
    expect(PLATFORM_NAMES.linkedin).toBe('LinkedIn');
  });

  it('should have all audience labels defined', () => {
    expect(AUDIENCE_LABELS.peers).toBeDefined();
    expect(AUDIENCE_LABELS.beginners).toBeDefined();
    expect(AUDIENCE_LABELS.leadership).toBeDefined();
    expect(AUDIENCE_LABELS.friends).toBeDefined();
  });

  it('should have all angle labels defined', () => {
    expect(ANGLE_LABELS.sharing).toBeDefined();
    expect(ANGLE_LABELS.asking).toBeDefined();
    expect(ANGLE_LABELS.opinion).toBeDefined();
    expect(ANGLE_LABELS.casual).toBeDefined();
    expect(ANGLE_LABELS.roast).toBeDefined();
    expect(ANGLE_LABELS.teaching).toBeDefined();
    expect(ANGLE_LABELS.story).toBeDefined();
  });

  it('should have matching audience descriptions for all labels', () => {
    Object.keys(AUDIENCE_LABELS).forEach((key) => {
      expect(AUDIENCE_DESCRIPTIONS[key as keyof typeof AUDIENCE_DESCRIPTIONS]).toBeDefined();
    });
  });

  it('should have matching angle descriptions for all labels', () => {
    Object.keys(ANGLE_LABELS).forEach((key) => {
      expect(ANGLE_DESCRIPTIONS[key as keyof typeof ANGLE_DESCRIPTIONS]).toBeDefined();
    });
  });
});
