// MISSION 2: NICOTINE / VAPING TIMELINE
export default {
  id: 'm2', num: 2, title: 'Nicotine & Vaping Timeline', theme: 'nicotine', est: 7,
  kicker: 'MISSION 2',
  blurb: 'Products change. Public attitudes change. The evidence about nicotine and the developing brain is the thread that connects them.',
  stages: [
    {
      kind: 'q', block: 'm2-a',
      q: {
        id: 'n1', domain: 'nicotine', topic: 'Nicotine and tobacco products', lo: 'Match nicotine/tobacco products to how they work',
        type: 'match', lvl: 'R', dok: 1, pts: 1, sec: 55,
        misc: 'Smokeless, pouches and e-cigarettes are interchangeable or “not tobacco-related”',
        prompt: 'Match each product to the description that fits it best.',
        items: [['p1', 'Cigarette'], ['p2', 'Cigar'], ['p3', 'Smokeless tobacco'], ['p4', 'Nicotine pouch'], ['p5', 'E-cigarette (vape)']],
        choices: [
          ['d1', 'Tobacco is burned. The smoke contains nicotine plus tar, carbon monoxide and many cancer-causing chemicals.'],
          ['d2', 'A roll of tobacco leaf that is burned. One large cigar can contain as much tobacco as a whole pack of cigarettes.'],
          ['d3', 'Tobacco held between the cheek and gum. It is not burned, but still delivers nicotine and cancer-causing chemicals through the mouth lining.'],
          ['d4', 'A small pouch held between the lip and gum that releases nicotine. It is not burned or chewed, but it still delivers addictive nicotine.'],
          ['d5', 'A battery-powered device that heats a liquid, often with nicotine and flavorings, into an aerosol that is inhaled.'],
          ['d6', 'Nicotine gum or a patch approved to help adults quit smoking.']
        ],
        ans: { p1: 'd1', p2: 'd2', p3: 'd3', p4: 'd4', p5: 'd5' },
        explain: 'Cigarettes and cigars burn tobacco. Smokeless tobacco and pouches are used in the mouth and are not burned. E-cigarettes heat a liquid into an aerosol. All of these can deliver addictive nicotine. Gum and patches are medications to help adults quit.'
      }
    },
    {
      kind: 'q', block: 'm2-a',
      q: {
        id: 'n2', domain: 'nicotine', topic: 'Smoke vs. aerosol vs. “water vapor”', lo: 'Classify what is in cigarette smoke and e-cigarette aerosol',
        type: 'sort', lvl: 'I', dok: 2, pts: 2, sec: 75,
        misc: '“Vapor” is just water vapor; aerosol is harmless',
        prompt: 'Sort each statement: does it describe cigarette smoke, e-cigarette aerosol, both, or neither (a myth)?',
        bins: [['smoke', 'Cigarette smoke'], ['aer', 'E-cigarette aerosol'], ['both', 'Both'], ['neither', 'Neither (myth)']],
        items: [
          ['s1', 'Made by burning tobacco'],
          ['s2', 'Made by heating a liquid with a coil, without burning'],
          ['s3', 'Contains tar'],
          ['s4', 'Can deliver nicotine, an addictive drug'],
          ['s5', 'Can irritate and harm the lungs and airways'],
          ['s6', 'Is only harmless water vapor'],
          ['s7', 'Contains carbon monoxide']
        ],
        ans: { s1: 'smoke', s2: 'aer', s3: 'smoke', s4: 'both', s5: 'both', s6: 'neither', s7: 'smoke' },
        explain: 'Burning tobacco creates tar and carbon monoxide. Heating e-liquid makes an aerosol of tiny particles, which can include nicotine, flavoring chemicals and metals. It is not just water vapor.'
      }
    },
    {
      kind: 'q', block: 'm2-a',
      q: {
        id: 'n3', domain: 'nicotine', topic: 'Relative risk', lo: 'Distinguish “less harmful” from “safe” and apply it to youth',
        type: 'mc', lvl: 'I', dok: 3, pts: 2, sec: 55,
        misc: '“Safer than cigarettes” means “safe”; or all nicotine products carry identical risk',
        stim: { title: 'Conversation', paras: ['A student’s cousin smoked for 20 years and switched completely to vaping. A 15-year-old friend says: “See? Vapes are safer, so it’s fine if I start.”'] },
        prompt: 'Which statement best separates “less harmful” from “safe”?',
        opts: [
          ['a', 'For adult smokers who switch completely, some toxic exposures may drop, but nicotine can still harm a developing brain, so “safer” is not “safe” for teens.'],
          ['b', 'Every nicotine product carries the same risks, so there is no meaningful difference between vaping and smoking for any age group, and comparing them only confuses people.'],
          ['c', 'A product that is safer than cigarettes is also safe for teens, as long as it comes in a flavor they like.'],
          ['d', 'Vapes release only water vapor, so there is no real exposure to compare with cigarette smoke at all.']
        ],
        ans: 'a',
        explain: 'Products differ in risk, and that is useful for adults who already smoke. It does not make any product safe or appropriate for youth, because nicotine harms adolescent brain development and can cause addiction.'
      }
    },
    {
      kind: 'q', block: 'm2-b',
      q: {
        id: 'n4', domain: 'nicotine', topic: 'Nicotine and the adolescent brain', lo: 'Identify effects of nicotine exposure on the developing brain',
        type: 'multi', lvl: 'R', dok: 1, pts: 1, sec: 45,
        misc: 'Nicotine is harmless because it is “just a stimulant”',
        prompt: 'Select ALL effects of nicotine exposure during adolescence that are supported by public health evidence.',
        opts: [
          ['a', 'It can harm the parts of the brain that control attention and learning.'],
          ['b', 'It can affect mood and impulse control.'],
          ['c', 'It can lead to nicotine addiction.'],
          ['d', 'It strengthens the prefrontal cortex so teens make better decisions.'],
          ['e', 'It has no effect on the brain until after age 25.'],
          ['f', 'It may increase the risk of later addiction to other drugs.']
        ],
        ans: ['a', 'b', 'c', 'f'],
        explain: 'Nicotine activates reward pathways and can interfere with brain areas for attention, learning, mood and impulse control while they are still developing. Adolescent exposure is linked to addiction and to higher risk of later drug use.'
      }
    },
    {
      kind: 'q', block: 'm2-b',
      q: {
        id: 'n5', domain: 'nicotine', topic: 'Changing tobacco use, attitudes and policy', lo: 'Place key tobacco milestones in order on a timeline',
        type: 'seq', layout: 'timeline', lvl: 'R', dok: 2, pts: 1, sec: 55,
        misc: 'Policy changes happened all at once, or e-cigarettes pre-date cigarette warnings',
        prompt: 'Drag the milestones onto the timeline, earliest on the left and most recent on the right.',
        steps: [
          ['e1', 'The U.S. Surgeon General’s first report links smoking to lung cancer and other diseases.'],
          ['e2', 'Cigarette advertising ends on U.S. television and radio.'],
          ['e3', 'A federal law gives the FDA authority to regulate tobacco products.'],
          ['e4', 'A slim, USB-shaped pod device with high-nicotine liquid launches and spreads quickly among teens.'],
          ['e5', 'The federal minimum age to buy tobacco products, including e-cigarettes, rises to 21.']
        ],
        ans: ['e1', 'e2', 'e3', 'e4', 'e5'],
        explain: 'The order is 1964 (Surgeon General’s report), 1971 (broadcast ad ban), 2009 (FDA authority), 2015 (pod devices spread), 2019 (minimum age raised to 21).'
      }
    },
    {
      kind: 'scene', scene: 'chart', id: 'g-adult', title: 'Adult cigarette smoking, 1965 to 2022',
      cfg: { chart: 'adult', hideAfter: 2015, hideUntil: 'g1p' },
      lead: 'Percent of U.S. adults who currently smoke cigarettes (CDC, National Health Interview Survey; selected years, rounded). Hover or use the arrow keys to read values.',
      qs: [
        {
          id: 'g1p', domain: 'nicotine', topic: 'Historical decline in cigarette smoking', lo: 'Predict a trend from the data shown',
          type: 'predict', lvl: 'AP', dok: 2, pts: 1, sec: 35,
          misc: 'Assuming a trend must stop or reverse',
          prompt: 'The graph shows 1965 to 2015. Based on the trend, which range is most likely for 2022?',
          opts: [['b1', 'Under 5%'], ['b2', '5% to 9%'], ['b3', '10% to 14%'], ['b4', '15% to 19%'], ['b5', '20% or more']],
          ans: 'b3',
          explain: 'The line fell from about 19% (2010) to 15% (2015), a drop of about 1 percentage point per year, which points to roughly 10 to 14% by 2022. The actual 2022 value was 11.6%.'
        },
        {
          id: 'g1b', domain: 'nicotine', topic: 'Interpreting tobacco trend data; limits of graphs', lo: 'Identify what a trend graph cannot prove',
          type: 'multi', lvl: 'AN', dok: 3, pts: 2, sec: 60, after: 'g1p',
          misc: 'Correlation/trend = cause; adult data = youth data',
          prompt: 'Select ALL conclusions this graph CANNOT prove by itself.',
          opts: [
            ['a', 'Which specific policy or event caused the decline.'],
            ['b', 'That the 2022 percentage is lower than the 1965 percentage.'],
            ['c', 'Whether teens smoked less at the same rate as adults.'],
            ['d', 'Whether adults who quit cigarettes started using other nicotine products.'],
            ['e', 'That the decline was not perfectly steady every year.']
          ],
          ans: ['a', 'c', 'd'],
          explain: 'The graph shows adult cigarette smoking only. It cannot show what caused the change, what teens did, or whether people switched to other products. It can show that 2022 is lower than 1965 and how steady the decline was.'
        }
      ]
    },
    {
      kind: 'scene', scene: 'chart', id: 'g-youth', title: 'High school students: cigarettes and e-cigarettes',
      cfg: { chart: 'youth' },
      lead: 'Percent of U.S. high school students who used the product in the past 30 days (National Youth Tobacco Survey, selected years). Use the buttons to show or hide a line.',
      qs: [
        {
          id: 'g2a', domain: 'nicotine', topic: 'Rise and decline of youth vaping', lo: 'Choose the interpretation best supported by two data series',
          type: 'mc', lvl: 'I', dok: 3, pts: 2, sec: 60,
          misc: 'One trend causes the other; a recent decline means the problem is over',
          prompt: 'Which interpretation is best supported by both lines?',
          opts: [
            ['a', 'Cigarette smoking fell after 2011, and e-cigarette use peaked in 2019, then fell but stayed above cigarette use in 2024.'],
            ['b', 'The rise of e-cigarettes caused the drop in cigarette smoking, because one line went up while the other went down.'],
            ['c', 'E-cigarette use has fallen since 2019, so youth nicotine use is no longer something schools need to address.'],
            ['d', 'E-cigarette use has climbed in every survey year since 2011, which shows vaping keeps getting more popular.']
          ],
          ans: 'a',
          explain: 'Both lines show real changes, but a graph of two trends cannot show that one caused the other. A decline from a peak does not mean use is zero or that nicotine is no longer a concern.'
        },
        {
          id: 'g2b', domain: 'nicotine', topic: 'Interpreting statistics', lo: 'Calculate and interpret a percent change',
          type: 'mc', lvl: 'AP', dok: 2, pts: 1, sec: 40,
          misc: 'Confusing percentage points with percent change',
          prompt: 'High school e-cigarette use fell from 27.5% in 2019 to 7.8% in 2024. About how large is that decrease as a percent of the 2019 value?',
          opts: [['a', 'About 20 percent'], ['b', 'About 45 percent'], ['c', 'About 70 percent'], ['d', 'About 95 percent']],
          ans: 'c',
          explain: 'The drop is 19.7 percentage points. As a share of the starting value, 19.7 ÷ 27.5 is about 0.72, so about a 70 percent decrease.'
        }
      ]
    }
  ]
};
