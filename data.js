/*
 * 기본 단가표 (2026년 창원(경남) 지역 아파트 시세 기준, 자재+시공비 포함, VAT 별도)
 * 관리자 화면(admin.html)에서 수정 후 "단가 파일 내보내기"로 이 파일을 교체할 수 있습니다.
 *
 * basis(수량 기준):
 *   supply   = 공급평수          floor    = 바닥 시공면적(평)
 *   rooms    = 방 개수           baths    = 욕실 개수
 *   doors    = 실내 문 개수      balconies = 발코니 개수
 *   kitchen  = 주방 길이(m)      set      = 1식
 *   manual   = 직접 입력 (defaultQty 사용)
 *
 * 철거 분류: 국대철거 단가표(2025) ×1.1 원가, markup(%) 만큼 마진을 붙여 고객가로 계산
 * link: 지정한 공사 항목을 선택하면 자동으로 함께 선택 (linkOpt: 공사 옵션 → 철거 옵션 매칭)
 * minAmount: 최소 금액 (원가 기준, 분류 마진 적용)
 * minAmountSingle: 단품 시공 최소 진입비 (원가 기준). 철거비와 진입비 중 큰 금액 하나만 적용, 폐기물 포함
 * requires: 이 항목을 선택하면 함께 진행해야 하는 필수 항목 (예: 샷시 → 도배)
 * storeyOpts: 층수에 따라 자동 선택할 옵션 [{maxStorey, opt}]
 * excludedBy: 이 항목들 중 하나라도 선택되면 이 항목은 넣지 않음 (중복 방지)
 * factor / roundUp: 자동 수량 = 기준 수량 × factor (roundUp이면 올림). 예) 벽지 롤 = 공급평 × 0.625
 * qtyAdd: 연동 대상의 옵션별 추가 수량 (예: 디아망이면 도배 시공 +1품)
 * option.first: 첫 단위 단가 (있으면 금액 = first + price × (수량-1)). 예) 세라믹코트 첫 칸 25만, 추가 칸 15만
 * modes: 표시할 시공 방식 (full = 전체 시공, single = 단품 시공)
 * singleOrder: 간편 견적(단품) 카드 순서 — 현관부터 집 안으로 들어가는 순서
 */
window.DEFAULT_CONFIG = {
  "version": 1,
  "company": {
    "name": "모반 ( MOVAN ) 인테리어",
    "ceo": "최현준",
    "phone": "010-3506-6692",
    "address": "경상남도 창원시 성산구 용지로 169번길 11-31, 3층",
    "bizNo": "607-22-76055",
    "kakao": "http://pf.kakao.com/_nmfBX/chat",
    "note": "본 견적은 평수 기준으로 자동 산출된 예상 금액이며, 현장 실측 및 세부 사양 확정 후 변동될 수 있습니다."
  },
  "rates": {
    "misc": 3,
    "supervision": 3,
    "profit": 10,
    "vat": 10
  },
  "singleOrder": ["middoor", "shoe", "floor", "wallpaper", "film", "light_single", "sink", "bath", "closet", "window", "balcony"],
  "categories": [
    {
      "id": "demo",
      "name": "철거",
      "markup": 0,
      "items": [
        {
          "id": "demo_sink",
          "name": "싱크대 철거",
          "basis": "kitchen",
          "link": "sink",
          "defaultOn": false,
          "options": [
            {
              "name": "상·하부장",
              "price": 33000
            },
            {
              "name": "하부장만",
              "price": 16500
            }
          ],
          "modes": [
            "full",
            "single"
          ],
          "minAmountSingle": 250000
        },
        {
          "id": "demo_fridge",
          "name": "냉장고장 철거",
          "basis": "set",
          "defaultOn": false,
          "options": [
            {
              "name": "냉장고장",
              "price": 55000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "demo_subkitchen",
          "name": "보조주방 철거",
          "basis": "manual",
          "unit": "m",
          "defaultQty": 2,
          "defaultOn": false,
          "options": [
            {
              "name": "보조주방",
              "price": 16500
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "demo_bath",
          "name": "욕실 철거",
          "entryName": "욕실 기본 철거",
          "entryDesc": "세면대·양변기·수전·악세서리·수납장·천장재 철거, 폐기물 포함",
          "basis": "baths",
          "link": "bath",
          "linkOpt": {
            "0": 0,
            "1": 0,
            "2": 1
          },
          "defaultOn": false,
          "options": [
            {
              "name": "기본 철거 (악세서리·도기·천장)",
              "price": 165000
            },
            {
              "name": "올철거 (기본 철거 포함)",
              "price": 660000
            },
            {
              "name": "UBR 철거",
              "price": 550000
            }
          ],
          "modes": [
            "full",
            "single"
          ],
          "minAmountSingle": 250000
        },
        {
          "id": "demo_bathtub",
          "name": "욕조 철거",
          "basis": "manual",
          "unit": "EA",
          "defaultQty": 1,
          "defaultOn": false,
          "options": [
            {
              "name": "욕조 (도기류·FRP)",
              "price": 55000
            },
            {
              "name": "조적 욕조",
              "price": 110000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "demo_door",
          "name": "문 철거",
          "basis": "doors",
          "link": "door",
          "defaultOn": false,
          "defaultOpt": 1,
          "options": [
            {
              "name": "문짝만",
              "price": 22000
            },
            {
              "name": "문 + 문틀",
              "price": 33000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "demo_closet",
          "name": "붙박이장 철거",
          "basis": "manual",
          "unit": "자",
          "defaultQty": 10,
          "link": "closet",
          "defaultOn": false,
          "options": [
            {
              "name": "붙박이장",
              "price": 11000
            }
          ],
          "modes": [
            "full",
            "single"
          ],
          "minAmountSingle": 200000
        },
        {
          "id": "demo_shoe",
          "name": "신발장 철거",
          "basis": "manual",
          "unit": "자",
          "defaultQty": 4,
          "link": "shoe",
          "defaultOn": false,
          "modes": [
            "single"
          ],
          "minAmountSingle": 200000,
          "options": [
            {
              "name": "기존 신발장",
              "price": 11000
            }
          ]
        },
        {
          "id": "demo_molding",
          "name": "몰딩·걸레받이 철거",
          "basis": "supply",
          "link": "wood",
          "defaultOn": false,
          "options": [
            {
              "name": "몰딩·걸레받이",
              "price": 5500
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "demo_ceiling",
          "name": "천장 철거",
          "basis": "supply",
          "defaultOn": false,
          "options": [
            {
              "name": "천장",
              "price": 33000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "demo_floor",
          "name": "기존 바닥재 철거",
          "basis": "floor",
          "link": "floor",
          "defaultOn": false,
          "defaultOpt": 0,
          "options": [
            {
              "name": "장판",
              "price": 5500
            },
            {
              "name": "강화마루 (샌딩 미포함)",
              "price": 18500
            },
            {
              "name": "강마루 (샌딩 포함)",
              "price": 27500
            },
            {
              "name": "데코타일 (샌딩 포함)",
              "price": 27500
            },
            {
              "name": "원목마루 (샌딩 포함)",
              "price": 38500
            },
            {
              "name": "맥반석 마루 (샌딩 포함)",
              "price": 55000
            },
            {
              "name": "MD마루 (샌딩 포함)",
              "price": 66000
            },
            {
              "name": "폴리싱 타일 (샌딩 포함)",
              "price": 66000
            }
          ],
          "modes": [
            "full",
            "single"
          ]
        },
        {
          "id": "demo_sanding",
          "name": "바닥 샌딩",
          "basis": "floor",
          "defaultOn": false,
          "minAmount": 165000,
          "options": [
            {
              "name": "바닥 샌딩",
              "price": 16500
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "demo_entrance",
          "name": "현관 바닥 철거",
          "basis": "manual",
          "unit": "평",
          "defaultQty": 1,
          "link": "entrance",
          "defaultOn": false,
          "options": [
            {
              "name": "대리석 (시다지 포함)",
              "price": 110000
            },
            {
              "name": "타일 (압착본드 제거)",
              "price": 66000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "demo_walltile",
          "name": "벽타일 철거",
          "basis": "manual",
          "unit": "㎡",
          "defaultQty": 10,
          "defaultOn": false,
          "options": [
            {
              "name": "벽타일 (압착본드 제거)",
              "price": 33000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "demo_artwall",
          "name": "아트월 철거",
          "basis": "manual",
          "unit": "㎡",
          "defaultQty": 6,
          "defaultOn": false,
          "options": [
            {
              "name": "아트월 (타일류)",
              "price": 22000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "demo_partition",
          "name": "석고 가벽 철거",
          "basis": "manual",
          "unit": "㎡",
          "defaultQty": 5,
          "defaultOn": false,
          "options": [
            {
              "name": "석고 가벽",
              "price": 33000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "demo_expand",
          "name": "발코니 확장 철거",
          "basis": "manual",
          "unit": "㎡",
          "defaultQty": 3,
          "defaultOn": false,
          "options": [
            {
              "name": "확장 (콘크리트)",
              "price": 132000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "demo_flowerbed",
          "name": "화단 철거",
          "basis": "set",
          "defaultOn": false,
          "options": [
            {
              "name": "화단 (화단 내 폐기물 포함)",
              "price": 330000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "demo_brick",
          "name": "조적벽 철거",
          "basis": "manual",
          "unit": "㎡",
          "defaultQty": 5,
          "defaultOn": false,
          "options": [
            {
              "name": "조적벽 (컷팅 포함)",
              "price": 77000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "waste",
          "name": "폐기물 처리",
          "basis": "supply",
          "defaultOn": true,
          "defaultOpt": 1,
          "options": [
            {
              "name": "부분 공사",
              "price": 15000
            },
            {
              "name": "전체 공사",
              "price": 30000
            }
          ],
          "modes": [
            "full"
          ]
        }
      ]
    },
    {
      "id": "carpentry",
      "name": "창호·목공·중문",
      "items": [
        {
          "id": "window",
          "name": "샷시(창호) 교체",
          "desc": "샷시 공사 시 도배 필수 (도배 항목 자동 포함)",
          "basis": "supply",
          "defaultOn": false,
          "defaultOpt": 1,
          "options": [
            {
              "name": "국산 일반 PVC",
              "price": 220000
            },
            {
              "name": "브랜드 (LX·KCC)",
              "price": 320000
            }
          ],
          "modes": [
            "full",
            "single"
          ],
          "requires": [
            "wallpaper"
          ]
        },
        {
          "id": "demo_window",
          "name": "기존 샷시 철거·폐기",
          "basis": "supply",
          "link": "window",
          "defaultOn": false,
          "modes": [
            "full",
            "single"
          ],
          "options": [
            {
              "name": "샷시 철거 + 폐샷시 처리 (샷시 업체 시공)",
              "price": 16000
            }
          ]
        },
        {
          "id": "window_hoist",
          "name": "샷시 양중",
          "basis": "set",
          "link": "window",
          "defaultOn": false,
          "modes": [
            "full",
            "single"
          ],
          "storeyOpts": [
            {
              "maxStorey": 10,
              "opt": 0
            },
            {
              "maxStorey": 999,
              "opt": 1
            }
          ],
          "options": [
            {
              "name": "사다리차 (10층 이하)",
              "price": 200000
            },
            {
              "name": "스카이차 (11층 이상)",
              "price": 500000
            }
          ]
        },
        {
          "id": "wood",
          "name": "목공 (천장·몰딩·걸레받이)",
          "basis": "supply",
          "defaultOn": true,
          "options": [
            {
              "name": "몰딩·걸레받이 교체",
              "price": 20000
            },
            {
              "name": "천장 평탄화 + 몰딩",
              "price": 75000
            },
            {
              "name": "무몰딩 + 간접조명 박스",
              "price": 125000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "door",
          "name": "실내 문 교체",
          "basis": "doors",
          "defaultOn": false,
          "options": [
            {
              "name": "ABS 도어",
              "price": 260000
            },
            {
              "name": "멤브레인 도어",
              "price": 360000
            },
            {
              "name": "히든 도어",
              "price": 640000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "middoor",
          "name": "현관 중문",
          "basis": "set",
          "defaultOn": false,
          "defaultOpt": 0,
          "options": [
            {
              "name": "3연동 슬라이딩",
              "price": 850000
            },
            {
              "name": "원슬라이딩",
              "price": 750000
            },
            {
              "name": "스윙 도어",
              "price": 950000
            }
          ],
          "modes": [
            "full",
            "single"
          ]
        },
        {
          "id": "closet",
          "name": "붙박이장·수납장 (한샘)",
          "basis": "manual",
          "unit": "자",
          "defaultQty": 10,
          "defaultOn": false,
          "options": [
            {
              "name": "한샘 베이직 붙박이장 (B2 도어)",
              "price": 122000
            },
            {
              "name": "한샘 베이직 붙박이장 + 파우더장(서랍형)",
              "price": 151000
            },
            {
              "name": "한샘 반침 다용도장 (화이트 PP)",
              "price": 122000
            }
          ],
          "modes": [
            "full",
            "single"
          ],
          "defaultOpt": 0
        },
        {
          "id": "shoe",
          "name": "신발장 (한샘)",
          "basis": "manual",
          "unit": "자",
          "defaultQty": 4,
          "defaultOn": false,
          "modes": [
            "single"
          ],
          "options": [
            {
              "name": "한샘 현관장 (행잉) + 중앙장식장",
              "price": 136000
            }
          ],
          "defaultOpt": 0
        }
      ]
    },
    {
      "id": "finish",
      "name": "기본 마감 (도배·바닥·도장)",
      "items": [
        {
          "id": "wallpaper",
          "name": "도배 (벽지 자재)",
          "desc": "샷시 공사 시 필수 항목 · 롤 수 = 공급평수 × 0.625 (올림, 32평 = 20롤)",
          "basis": "supply",
          "defaultOn": true,
          "defaultOpt": 0,
          "options": [
            {
              "name": "LX 베스띠 (실크)",
              "price": 36000
            },
            {
              "name": "신한 파사드 (실크)",
              "price": 50000
            },
            {
              "name": "LX 디아망 (프리미엄 실크)",
              "price": 60000
            }
          ],
          "modes": [
            "full",
            "single"
          ],
          "factor": 0.625,
          "roundUp": true,
          "unit": "롤",
          "groupName": "도배"
        },
        {
          "id": "wallpaper_labor",
          "name": "도배 시공",
          "desc": "품 수 = 공급평수 × 0.1875 (올림, 32평 = 6품)",
          "basis": "supply",
          "factor": 0.1875,
          "roundUp": true,
          "unit": "품",
          "link": "wallpaper",
          "qtyAdd": {
            "2": 1
          },
          "defaultOn": false,
          "modes": [
            "full",
            "single"
          ],
          "options": [
            {
              "name": "도배사 시공 (1품)",
              "price": 300000
            }
          ]
        },
        {
          "id": "wallpaper_supplies",
          "name": "도배 부자재",
          "basis": "set",
          "link": "wallpaper",
          "defaultOn": false,
          "modes": [
            "full",
            "single"
          ],
          "options": [
            {
              "name": "초배지·풀·부자재 일체 (현장당)",
              "price": 400000
            }
          ]
        },
        {
          "id": "floor",
          "name": "바닥재",
          "basis": "floor",
          "defaultOn": true,
          "defaultOpt": 2,
          "defaultOptSingle": 0,
          "options": [
            {
              "name": "장판 (2.2T)",
              "price": 24500,
              "unit": "m",
              "basis": "supply",
              "factor": 1.8,
              "roundUp": true
            },
            {
              "name": "강화마루",
              "price": 105000
            },
            {
              "name": "강마루",
              "price": 140000
            },
            {
              "name": "원목마루",
              "price": 300000
            },
            {
              "name": "포세린 타일",
              "price": 270000
            }
          ],
          "modes": [
            "full",
            "single"
          ]
        },
        {
          "id": "film",
          "name": "문·문틀 필름",
          "basis": "doors",
          "defaultOn": false,
          "options": [
            {
              "name": "일반 필름 (필름지+시공, 문짝 양면·문틀)",
              "price": 240000
            },
            {
              "name": "고급 필름 (필름지+시공, 문짝 양면·문틀)",
              "price": 330000
            }
          ],
          "modes": [
            "full",
            "single"
          ]
        },
        {
          "id": "paint",
          "name": "도장 (문·몰딩 페인트)",
          "basis": "doors",
          "defaultOn": false,
          "options": [
            {
              "name": "일반 도장",
              "price": 190000
            },
            {
              "name": "친환경 도장",
              "price": 260000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "balcony",
          "name": "발코니 세라믹코트",
          "basis": "balconies",
          "defaultOn": false,
          "options": [
            {
              "name": "세라믹코트",
              "first": 250000,
              "price": 150000
            }
          ],
          "modes": [
            "full",
            "single"
          ],
          "unit": "칸",
          "defaultOpt": 0
        },
        {
          "id": "entrance",
          "name": "현관 타일·신발장",
          "basis": "set",
          "defaultOn": false,
          "defaultOpt": 1,
          "options": [
            {
              "name": "현관 타일만",
              "price": 550000
            },
            {
              "name": "타일 + 신발장",
              "price": 1600000
            }
          ],
          "modes": [
            "full"
          ]
        }
      ]
    },
    {
      "id": "kitchenbath",
      "name": "주방·욕실",
      "items": [
        {
          "id": "sink",
          "name": "부엌 (싱크대)",
          "basis": "kitchen",
          "defaultOn": true,
          "options": [
            {
              "name": "일반 사제 · PET 도어·인조대리석 상판, 후드·수전·싱크볼 포함",
              "price": 650000
            },
            {
              "name": "한샘 ML100 (기본형) · 후드·수전·상판 포함",
              "price": 1130000
            },
            {
              "name": "한샘 ML200 · 후드·수전·상판 포함",
              "price": 1350000
            },
            {
              "name": "한샘 Euro300 · 후드·수전·상판 포함",
              "price": 1550000
            }
          ],
          "modes": [
            "full",
            "single"
          ],
          "defaultOpt": 1
        },
        {
          "id": "bath",
          "name": "욕실 리모델링",
          "desc": "기본 제품 포함: 세면대·양변기·수전·거울 슬라이딩장·샤워파티션·천장재·환풍기·매립등·기본 악세서리 3품",
          "basis": "baths",
          "defaultOn": true,
          "defaultOpt": 0,
          "options": [
            {
              "name": "덧방 (벽 300×600 + 바닥 300각)",
              "price": 2930000
            },
            {
              "name": "덧방 (벽·바닥 600각)",
              "price": 3120000
            },
            {
              "name": "전체 철거 후 재시공 (방수 포함)",
              "price": 3250000
            }
          ],
          "modes": [
            "full",
            "single"
          ]
        }
      ]
    },
    {
      "id": "mep",
      "name": "설비·전기·조명",
      "items": [
        {
          "id": "light_detach",
          "name": "조명·콘센트·스위치 탈부착",
          "basis": "set",
          "link": "wallpaper",
          "excludedBy": [
            "light",
            "light_single"
          ],
          "defaultOn": false,
          "modes": [
            "full",
            "single"
          ],
          "options": [
            {
              "name": "전기 기사 최소 진입비",
              "price": 200000
            }
          ]
        },
        {
          "id": "light",
          "name": "조명 교체",
          "basis": "supply",
          "defaultOn": true,
          "options": [
            {
              "name": "LED 직부등",
              "price": 25000
            },
            {
              "name": "다운라이트 위주",
              "price": 50000
            },
            {
              "name": "라인·간접 조명",
              "price": 85000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "light_single",
          "name": "조명 교체",
          "desc": "기본 교체 시공비 (기존 등 철거·신규 등 설치), 조명 자재비 별도",
          "basis": "manual",
          "unit": "개",
          "defaultQty": 5,
          "defaultOn": false,
          "options": [
            {
              "name": "조명 기본 교체 (자재 별도)",
              "price": 30000
            }
          ],
          "modes": [
            "single"
          ]
        },
        {
          "id": "switch",
          "name": "스위치·콘센트 교체",
          "basis": "supply",
          "defaultOn": true,
          "options": [
            {
              "name": "일반 제품",
              "price": 10000
            },
            {
              "name": "디자인 제품",
              "price": 19000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "wiring",
          "name": "전기 배선·분전반",
          "basis": "set",
          "defaultOn": false,
          "options": [
            {
              "name": "부분 증설",
              "price": 700000
            },
            {
              "name": "전체 배선 교체",
              "price": 2600000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "pipe",
          "name": "수도·난방 배관 교체",
          "basis": "supply",
          "defaultOn": false,
          "options": [
            {
              "name": "급수·배수 배관",
              "price": 45000
            },
            {
              "name": "난방 배관 포함",
              "price": 130000
            }
          ],
          "modes": [
            "full"
          ]
        }
      ]
    },
    {
      "id": "temp",
      "name": "가설·청소",
      "items": [
        {
          "id": "protect",
          "name": "보양·가설·엘리베이터 사용",
          "basis": "set",
          "defaultOn": true,
          "options": [
            {
              "name": "기본",
              "price": 500000
            }
          ],
          "modes": [
            "full"
          ]
        },
        {
          "id": "clean",
          "name": "준공 청소",
          "basis": "supply",
          "defaultOn": true,
          "options": [
            {
              "name": "입주 청소",
              "price": 12000
            }
          ],
          "modes": [
            "full"
          ]
        }
      ]
    }
  ]
};
