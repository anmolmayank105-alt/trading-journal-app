// Comprehensive list of Indian stocks listed on NSE/BSE
// Top 500+ companies by market cap and trading volume

export interface StockInfo {
  symbol: string;
  name: string;
  sector: string;
  exchange: 'NSE' | 'BSE' | 'BOTH';
}

// NIFTY 50 Components
export const NIFTY_50: StockInfo[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', sector: 'Telecom', exchange: 'BOTH' },
  { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG', exchange: 'BOTH' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', sector: 'FMCG', exchange: 'BOTH' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', sector: 'Infrastructure', exchange: 'BOTH' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'TITAN', name: 'Titan Company Ltd', sector: 'Consumer Goods', exchange: 'BOTH' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', sector: 'Auto', exchange: 'BOTH' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', sector: 'Cement', exchange: 'BOTH' },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'NTPC', name: 'NTPC Ltd', sector: 'Power', exchange: 'BOTH' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', sector: 'Auto', exchange: 'BOTH' },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd', sector: 'FMCG', exchange: 'BOTH' },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation of India Ltd', sector: 'Power', exchange: 'BOTH' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd', sector: 'Metals', exchange: 'BOTH' },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', sector: 'Metals', exchange: 'BOTH' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd', sector: 'Auto', exchange: 'BOTH' },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', sector: 'Conglomerate', exchange: 'BOTH' },
  { symbol: 'ADANIPORTS', name: 'Adani Ports and SEZ Ltd', sector: 'Infrastructure', exchange: 'BOTH' },
  { symbol: 'COALINDIA', name: 'Coal India Ltd', sector: 'Mining', exchange: 'BOTH' },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance Company Ltd', sector: 'Insurance', exchange: 'BOTH' },
  { symbol: 'SBILIFE', name: 'SBI Life Insurance Company Ltd', sector: 'Insurance', exchange: 'BOTH' },
  { symbol: 'GRASIM', name: 'Grasim Industries Ltd', sector: 'Cement', exchange: 'BOTH' },
  { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd', sector: 'FMCG', exchange: 'BOTH' },
  { symbol: 'DIVISLAB', name: 'Divi\'s Laboratories Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'DRREDDY', name: 'Dr. Reddy\'s Laboratories Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'CIPLA', name: 'Cipla Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd', sector: 'Auto', exchange: 'BOTH' },
  { symbol: 'BPCL', name: 'Bharat Petroleum Corporation Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', sector: 'Metals', exchange: 'BOTH' },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise Ltd', sector: 'Healthcare', exchange: 'BOTH' },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd', sector: 'Auto', exchange: 'BOTH' },
  { symbol: 'TATACONSUM', name: 'Tata Consumer Products Ltd', sector: 'FMCG', exchange: 'BOTH' },
  { symbol: 'SHRIRAMFIN', name: 'Shriram Finance Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd', sector: 'Auto', exchange: 'BOTH' },
  { symbol: 'LTIM', name: 'LTIMindtree Ltd', sector: 'IT', exchange: 'BOTH' },
];

// NIFTY Next 50 and other large caps
export const NIFTY_NEXT_50: StockInfo[] = [
  { symbol: 'ADANIGREEN', name: 'Adani Green Energy Ltd', sector: 'Power', exchange: 'BOTH' },
  { symbol: 'ADANIPOWER', name: 'Adani Power Ltd', sector: 'Power', exchange: 'BOTH' },
  { symbol: 'AMBUJACEM', name: 'Ambuja Cements Ltd', sector: 'Cement', exchange: 'BOTH' },
  { symbol: 'ACC', name: 'ACC Ltd', sector: 'Cement', exchange: 'BOTH' },
  { symbol: 'AUROPHARMA', name: 'Aurobindo Pharma Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'BANKBARODA', name: 'Bank of Baroda', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'BEL', name: 'Bharat Electronics Ltd', sector: 'Defence', exchange: 'BOTH' },
  { symbol: 'BERGEPAINT', name: 'Berger Paints India Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'BIOCON', name: 'Biocon Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'BOSCHLTD', name: 'Bosch Ltd', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'CANBK', name: 'Canara Bank', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'CHOLAFIN', name: 'Cholamandalam Investment and Finance', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'COLPAL', name: 'Colgate-Palmolive (India) Ltd', sector: 'FMCG', exchange: 'BOTH' },
  { symbol: 'DLF', name: 'DLF Ltd', sector: 'Real Estate', exchange: 'BOTH' },
  { symbol: 'DABUR', name: 'Dabur India Ltd', sector: 'FMCG', exchange: 'BOTH' },
  { symbol: 'GAIL', name: 'GAIL (India) Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'GODREJCP', name: 'Godrej Consumer Products Ltd', sector: 'FMCG', exchange: 'BOTH' },
  { symbol: 'GODREJPROP', name: 'Godrej Properties Ltd', sector: 'Real Estate', exchange: 'BOTH' },
  { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd', sector: 'Defence', exchange: 'BOTH' },
  { symbol: 'HAVELLS', name: 'Havells India Ltd', sector: 'Consumer Durables', exchange: 'BOTH' },
  { symbol: 'ICICIPRULI', name: 'ICICI Prudential Life Insurance', sector: 'Insurance', exchange: 'BOTH' },
  { symbol: 'ICICIGI', name: 'ICICI Lombard General Insurance', sector: 'Insurance', exchange: 'BOTH' },
  { symbol: 'IOC', name: 'Indian Oil Corporation Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'INDUSTOWER', name: 'Indus Towers Ltd', sector: 'Telecom', exchange: 'BOTH' },
  { symbol: 'JINDALSTEL', name: 'Jindal Steel & Power Ltd', sector: 'Metals', exchange: 'BOTH' },
  { symbol: 'LUPIN', name: 'Lupin Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'MARICO', name: 'Marico Ltd', sector: 'FMCG', exchange: 'BOTH' },
  { symbol: 'MCDOWELL-N', name: 'United Spirits Ltd', sector: 'Beverages', exchange: 'BOTH' },
  { symbol: 'MOTHERSON', name: 'Samvardhana Motherson International', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'MUTHOOTFIN', name: 'Muthoot Finance Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'NAUKRI', name: 'Info Edge (India) Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'NMDC', name: 'NMDC Ltd', sector: 'Mining', exchange: 'BOTH' },
  { symbol: 'OBEROIRLTY', name: 'Oberoi Realty Ltd', sector: 'Real Estate', exchange: 'BOTH' },
  { symbol: 'OFSS', name: 'Oracle Financial Services Software', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'PAGEIND', name: 'Page Industries Ltd', sector: 'Textiles', exchange: 'BOTH' },
  { symbol: 'PETRONET', name: 'Petronet LNG Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'PIDILITIND', name: 'Pidilite Industries Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'PFC', name: 'Power Finance Corporation Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'PIIND', name: 'PI Industries Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'PNB', name: 'Punjab National Bank', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'RECLTD', name: 'REC Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'SBICARD', name: 'SBI Cards and Payment Services', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'SIEMENS', name: 'Siemens Ltd', sector: 'Capital Goods', exchange: 'BOTH' },
  { symbol: 'SRF', name: 'SRF Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'TORNTPHARM', name: 'Torrent Pharmaceuticals Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'TRENT', name: 'Trent Ltd', sector: 'Retail', exchange: 'BOTH' },
  { symbol: 'TVSMOTOR', name: 'TVS Motor Company Ltd', sector: 'Auto', exchange: 'BOTH' },
  { symbol: 'UPL', name: 'UPL Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'VEDL', name: 'Vedanta Ltd', sector: 'Metals', exchange: 'BOTH' },
  { symbol: 'ZOMATO', name: 'Zomato Ltd', sector: 'Consumer Services', exchange: 'BOTH' },
];

// Mid Cap stocks (NIFTY Midcap 100 and others)
export const MID_CAP_STOCKS: StockInfo[] = [
  { symbol: 'AARTIIND', name: 'Aarti Industries Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'ABCAPITAL', name: 'Aditya Birla Capital Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'ABFRL', name: 'Aditya Birla Fashion and Retail', sector: 'Retail', exchange: 'BOTH' },
  { symbol: 'AJANTPHARM', name: 'Ajanta Pharma Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'ALKEM', name: 'Alkem Laboratories Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'APLLTD', name: 'Alembic Pharmaceuticals Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'ASHOKLEY', name: 'Ashok Leyland Ltd', sector: 'Auto', exchange: 'BOTH' },
  { symbol: 'ASTRAL', name: 'Astral Ltd', sector: 'Building Materials', exchange: 'BOTH' },
  { symbol: 'ATUL', name: 'Atul Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'AUBANK', name: 'AU Small Finance Bank Ltd', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'AUROPHARMA', name: 'Aurobindo Pharma Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'BALKRISIND', name: 'Balkrishna Industries Ltd', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'BANDHANBNK', name: 'Bandhan Bank Ltd', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'BATAINDIA', name: 'Bata India Ltd', sector: 'Consumer Goods', exchange: 'BOTH' },
  { symbol: 'BHARATFORG', name: 'Bharat Forge Ltd', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'BHEL', name: 'Bharat Heavy Electricals Ltd', sector: 'Capital Goods', exchange: 'BOTH' },
  { symbol: 'BLUEDART', name: 'Blue Dart Express Ltd', sector: 'Logistics', exchange: 'BOTH' },
  { symbol: 'CANFINHOME', name: 'Can Fin Homes Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'CASTROLIND', name: 'Castrol India Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'CENTRALBK', name: 'Central Bank of India', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'CGPOWER', name: 'CG Power and Industrial Solutions', sector: 'Capital Goods', exchange: 'BOTH' },
  { symbol: 'CHAMBLFERT', name: 'Chambal Fertilizers & Chemicals', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'COFORGE', name: 'Coforge Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'CONCOR', name: 'Container Corporation of India', sector: 'Logistics', exchange: 'BOTH' },
  { symbol: 'COROMANDEL', name: 'Coromandel International Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'CROMPTON', name: 'Crompton Greaves Consumer Electricals', sector: 'Consumer Durables', exchange: 'BOTH' },
  { symbol: 'CUB', name: 'City Union Bank Ltd', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'CUMMINSIND', name: 'Cummins India Ltd', sector: 'Capital Goods', exchange: 'BOTH' },
  { symbol: 'DEEPAKNTR', name: 'Deepak Nitrite Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'DELHIVERY', name: 'Delhivery Ltd', sector: 'Logistics', exchange: 'BOTH' },
  { symbol: 'DEVYANI', name: 'Devyani International Ltd', sector: 'Consumer Services', exchange: 'BOTH' },
  { symbol: 'DIXON', name: 'Dixon Technologies (India) Ltd', sector: 'Consumer Durables', exchange: 'BOTH' },
  { symbol: 'ECLERX', name: 'eClerx Services Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'EMAMILTD', name: 'Emami Ltd', sector: 'FMCG', exchange: 'BOTH' },
  { symbol: 'ENDURANCE', name: 'Endurance Technologies Ltd', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'ESCORTS', name: 'Escorts Kubota Ltd', sector: 'Auto', exchange: 'BOTH' },
  { symbol: 'EXIDEIND', name: 'Exide Industries Ltd', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'FEDERALBNK', name: 'Federal Bank Ltd', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'FORTIS', name: 'Fortis Healthcare Ltd', sector: 'Healthcare', exchange: 'BOTH' },
  { symbol: 'GLAND', name: 'Gland Pharma Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'GLENMARK', name: 'Glenmark Pharmaceuticals Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'GMRINFRA', name: 'GMR Airports Infrastructure Ltd', sector: 'Infrastructure', exchange: 'BOTH' },
  { symbol: 'GNFC', name: 'Gujarat Narmada Valley Fertilizers', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'GRANULES', name: 'Granules India Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'GSFC', name: 'Gujarat State Fertilizers & Chemicals', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'GSPL', name: 'Gujarat State Petronet Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'GUJGASLTD', name: 'Gujarat Gas Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'HEG', name: 'HEG Ltd', sector: 'Capital Goods', exchange: 'BOTH' },
  { symbol: 'HFCL', name: 'HFCL Ltd', sector: 'Telecom', exchange: 'BOTH' },
  { symbol: 'HINDZINC', name: 'Hindustan Zinc Ltd', sector: 'Metals', exchange: 'BOTH' },
];

// Small Cap and other actively traded stocks
export const SMALL_CAP_STOCKS: StockInfo[] = [
  { symbol: 'IDEA', name: 'Vodafone Idea Ltd', sector: 'Telecom', exchange: 'BOTH' },
  { symbol: 'IDFCFIRSTB', name: 'IDFC First Bank Ltd', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'IEX', name: 'Indian Energy Exchange Ltd', sector: 'Power', exchange: 'BOTH' },
  { symbol: 'IGL', name: 'Indraprastha Gas Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'IIFL', name: 'IIFL Finance Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'INDHOTEL', name: 'Indian Hotels Company Ltd', sector: 'Hotels', exchange: 'BOTH' },
  { symbol: 'INDIACEM', name: 'India Cements Ltd', sector: 'Cement', exchange: 'BOTH' },
  { symbol: 'INDIAMART', name: 'IndiaMART InterMESH Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'INDIANB', name: 'Indian Bank', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'INTELLECT', name: 'Intellect Design Arena Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'IOB', name: 'Indian Overseas Bank', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'IPCALAB', name: 'IPCA Laboratories Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'IRB', name: 'IRB Infrastructure Developers Ltd', sector: 'Infrastructure', exchange: 'BOTH' },
  { symbol: 'IRCTC', name: 'Indian Railway Catering and Tourism', sector: 'Consumer Services', exchange: 'BOTH' },
  { symbol: 'IRFC', name: 'Indian Railway Finance Corporation', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'ISEC', name: 'ICICI Securities Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'J&KBANK', name: 'Jammu & Kashmir Bank Ltd', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'JKCEMENT', name: 'JK Cement Ltd', sector: 'Cement', exchange: 'BOTH' },
  { symbol: 'JKLAKSHMI', name: 'JK Lakshmi Cement Ltd', sector: 'Cement', exchange: 'BOTH' },
  { symbol: 'JSWENERGY', name: 'JSW Energy Ltd', sector: 'Power', exchange: 'BOTH' },
  { symbol: 'JUBLFOOD', name: 'Jubilant Foodworks Ltd', sector: 'Consumer Services', exchange: 'BOTH' },
  { symbol: 'KAJARIACER', name: 'Kajaria Ceramics Ltd', sector: 'Building Materials', exchange: 'BOTH' },
  { symbol: 'KANSAINER', name: 'Kansai Nerolac Paints Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'KEI', name: 'KEI Industries Ltd', sector: 'Capital Goods', exchange: 'BOTH' },
  { symbol: 'KIMS', name: 'Krishna Institute of Medical Sciences', sector: 'Healthcare', exchange: 'BOTH' },
  { symbol: 'KPITTECH', name: 'KPIT Technologies Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'KRBL', name: 'KRBL Ltd', sector: 'FMCG', exchange: 'BOTH' },
  { symbol: 'L&TFH', name: 'L&T Finance Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'LALPATHLAB', name: 'Dr. Lal PathLabs Ltd', sector: 'Healthcare', exchange: 'BOTH' },
  { symbol: 'LATENTVIEW', name: 'Latent View Analytics Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'LAURUSLABS', name: 'Laurus Labs Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'LICHSGFIN', name: 'LIC Housing Finance Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'LICI', name: 'Life Insurance Corporation of India', sector: 'Insurance', exchange: 'BOTH' },
  { symbol: 'LINDEINDIA', name: 'Linde India Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'LTTS', name: 'L&T Technology Services Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'M&MFIN', name: 'Mahindra & Mahindra Financial Services', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'MAHLIFE', name: 'Mahindra Lifespace Developers', sector: 'Real Estate', exchange: 'BOTH' },
  { symbol: 'MANAPPURAM', name: 'Manappuram Finance Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'MAZDOCK', name: 'Mazagon Dock Shipbuilders Ltd', sector: 'Defence', exchange: 'BOTH' },
  { symbol: 'MCX', name: 'Multi Commodity Exchange of India', sector: 'Financial Services', exchange: 'BOTH' },
  { symbol: 'MEDANTA', name: 'Global Health Ltd', sector: 'Healthcare', exchange: 'BOTH' },
  { symbol: 'METROPOLIS', name: 'Metropolis Healthcare Ltd', sector: 'Healthcare', exchange: 'BOTH' },
  { symbol: 'MFSL', name: 'Max Financial Services Ltd', sector: 'Insurance', exchange: 'BOTH' },
  { symbol: 'MGL', name: 'Mahanagar Gas Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'MINDACORP', name: 'Minda Corporation Ltd', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'MINDAIND', name: 'Minda Industries Ltd', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'MPHASIS', name: 'Mphasis Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'MRF', name: 'MRF Ltd', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'NATCOPHARM', name: 'Natco Pharma Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'NATIONALUM', name: 'National Aluminium Company Ltd', sector: 'Metals', exchange: 'BOTH' },
];

// More actively traded stocks
export const OTHER_STOCKS: StockInfo[] = [
  { symbol: 'NAUKRI', name: 'Info Edge (India) Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'NAVINFLUOR', name: 'Navin Fluorine International Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'NBCC', name: 'NBCC (India) Ltd', sector: 'Infrastructure', exchange: 'BOTH' },
  { symbol: 'NCC', name: 'NCC Ltd', sector: 'Infrastructure', exchange: 'BOTH' },
  { symbol: 'NHPC', name: 'NHPC Ltd', sector: 'Power', exchange: 'BOTH' },
  { symbol: 'NOCIL', name: 'NOCIL Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'OLECTRA', name: 'Olectra Greentech Ltd', sector: 'Auto', exchange: 'BOTH' },
  { symbol: 'ONGC', name: 'Oil and Natural Gas Corporation', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'PAYTM', name: 'One 97 Communications Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'PCBL', name: 'PCBL Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'PERSISTENT', name: 'Persistent Systems Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'PHOENIXLTD', name: 'Phoenix Mills Ltd', sector: 'Real Estate', exchange: 'BOTH' },
  { symbol: 'POLYCAB', name: 'Polycab India Ltd', sector: 'Capital Goods', exchange: 'BOTH' },
  { symbol: 'POONAWALLA', name: 'Poonawalla Fincorp Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'PRESTIGE', name: 'Prestige Estates Projects Ltd', sector: 'Real Estate', exchange: 'BOTH' },
  { symbol: 'PVRINOX', name: 'PVR INOX Ltd', sector: 'Entertainment', exchange: 'BOTH' },
  { symbol: 'RADICO', name: 'Radico Khaitan Ltd', sector: 'Beverages', exchange: 'BOTH' },
  { symbol: 'RAIN', name: 'Rain Industries Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'RAJESHEXPO', name: 'Rajesh Exports Ltd', sector: 'Gems & Jewellery', exchange: 'BOTH' },
  { symbol: 'RAMCOCEM', name: 'Ramco Cements Ltd', sector: 'Cement', exchange: 'BOTH' },
  { symbol: 'RATNAMANI', name: 'Ratnamani Metals & Tubes Ltd', sector: 'Metals', exchange: 'BOTH' },
  { symbol: 'RAYMOND', name: 'Raymond Ltd', sector: 'Textiles', exchange: 'BOTH' },
  { symbol: 'RBLBANK', name: 'RBL Bank Ltd', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'ROUTE', name: 'Route Mobile Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'SAIL', name: 'Steel Authority of India Ltd', sector: 'Metals', exchange: 'BOTH' },
  { symbol: 'SANOFI', name: 'Sanofi India Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'SCHAEFFLER', name: 'Schaeffler India Ltd', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'SHREECEM', name: 'Shree Cement Ltd', sector: 'Cement', exchange: 'BOTH' },
  { symbol: 'SJVN', name: 'SJVN Ltd', sector: 'Power', exchange: 'BOTH' },
  { symbol: 'SKFINDIA', name: 'SKF India Ltd', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'SOBHA', name: 'Sobha Ltd', sector: 'Real Estate', exchange: 'BOTH' },
  { symbol: 'SOLARA', name: 'Solara Active Pharma Sciences', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'SONACOMS', name: 'Sona BLW Precision Forgings Ltd', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'SONATSOFTW', name: 'Sonata Software Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'STAR', name: 'Strides Pharma Science Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'STARHEALTH', name: 'Star Health & Allied Insurance', sector: 'Insurance', exchange: 'BOTH' },
  { symbol: 'SUNFLAG', name: 'Sunflag Iron & Steel Company', sector: 'Metals', exchange: 'BOTH' },
  { symbol: 'SUNTV', name: 'Sun TV Network Ltd', sector: 'Media', exchange: 'BOTH' },
  { symbol: 'SUPREMEIND', name: 'Supreme Industries Ltd', sector: 'Building Materials', exchange: 'BOTH' },
  { symbol: 'SUVENPHAR', name: 'Suven Pharmaceuticals Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'SWANENERGY', name: 'Swan Energy Ltd', sector: 'Diversified', exchange: 'BOTH' },
  { symbol: 'SYNGENE', name: 'Syngene International Ltd', sector: 'Pharma', exchange: 'BOTH' },
  { symbol: 'TATACHEM', name: 'Tata Chemicals Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'TATACOMM', name: 'Tata Communications Ltd', sector: 'Telecom', exchange: 'BOTH' },
  { symbol: 'TATAELXSI', name: 'Tata Elxsi Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'TATAPOWER', name: 'Tata Power Company Ltd', sector: 'Power', exchange: 'BOTH' },
  { symbol: 'TATVA', name: 'Tatva Chintan Pharma Chem Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'TCI', name: 'Transport Corporation of India', sector: 'Logistics', exchange: 'BOTH' },
  { symbol: 'THERMAX', name: 'Thermax Ltd', sector: 'Capital Goods', exchange: 'BOTH' },
  { symbol: 'TIINDIA', name: 'Tube Investments of India Ltd', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'TIMKEN', name: 'Timken India Ltd', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'TORNTPOWER', name: 'Torrent Power Ltd', sector: 'Power', exchange: 'BOTH' },
  { symbol: 'TTML', name: 'Tata Teleservices (Maharashtra)', sector: 'Telecom', exchange: 'BOTH' },
  { symbol: 'TV18BRDCST', name: 'TV18 Broadcast Ltd', sector: 'Media', exchange: 'BOTH' },
  { symbol: 'UCOBANK', name: 'UCO Bank', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'UJJIVAN', name: 'Ujjivan Small Finance Bank Ltd', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'UNIONBANK', name: 'Union Bank of India', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'UPL', name: 'UPL Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'VAIBHAVGBL', name: 'Vaibhav Global Ltd', sector: 'Consumer Goods', exchange: 'BOTH' },
  { symbol: 'VAKRANGEE', name: 'Vakrangee Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'VEDL', name: 'Vedanta Ltd', sector: 'Metals', exchange: 'BOTH' },
  { symbol: 'VINATIORGA', name: 'Vinati Organics Ltd', sector: 'Chemicals', exchange: 'BOTH' },
  { symbol: 'VOLTAS', name: 'Voltas Ltd', sector: 'Consumer Durables', exchange: 'BOTH' },
  { symbol: 'VGUARD', name: 'V-Guard Industries Ltd', sector: 'Consumer Durables', exchange: 'BOTH' },
  { symbol: 'VBL', name: 'Varun Beverages Ltd', sector: 'Beverages', exchange: 'BOTH' },
  { symbol: 'WELCORP', name: 'Welspun Corp Ltd', sector: 'Metals', exchange: 'BOTH' },
  { symbol: 'WELSPUNIND', name: 'Welspun India Ltd', sector: 'Textiles', exchange: 'BOTH' },
  { symbol: 'WHIRLPOOL', name: 'Whirlpool of India Ltd', sector: 'Consumer Durables', exchange: 'BOTH' },
  { symbol: 'YESBANK', name: 'Yes Bank Ltd', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'ZEEL', name: 'Zee Entertainment Enterprises', sector: 'Media', exchange: 'BOTH' },
  { symbol: 'ZENSARTECH', name: 'Zensar Technologies Ltd', sector: 'IT', exchange: 'BOTH' },
  { symbol: 'ZYDUSLIFE', name: 'Zydus Lifesciences Ltd', sector: 'Pharma', exchange: 'BOTH' },
];

// PSU Stocks
export const PSU_STOCKS: StockInfo[] = [
  { symbol: 'BANKBARODA', name: 'Bank of Baroda', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'BHARATFORG', name: 'Bharat Forge Ltd', sector: 'Auto Ancillary', exchange: 'BOTH' },
  { symbol: 'BHEL', name: 'Bharat Heavy Electricals Ltd', sector: 'Capital Goods', exchange: 'BOTH' },
  { symbol: 'BPCL', name: 'Bharat Petroleum Corporation Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'BEL', name: 'Bharat Electronics Ltd', sector: 'Defence', exchange: 'BOTH' },
  { symbol: 'CONCOR', name: 'Container Corporation of India', sector: 'Logistics', exchange: 'BOTH' },
  { symbol: 'GAIL', name: 'GAIL (India) Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd', sector: 'Defence', exchange: 'BOTH' },
  { symbol: 'HINDCOPPER', name: 'Hindustan Copper Ltd', sector: 'Metals', exchange: 'BOTH' },
  { symbol: 'HUDCO', name: 'Housing & Urban Development Corp', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'IOC', name: 'Indian Oil Corporation Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'IRCTC', name: 'Indian Railway Catering & Tourism', sector: 'Consumer Services', exchange: 'BOTH' },
  { symbol: 'IRFC', name: 'Indian Railway Finance Corporation', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'MRPL', name: 'Mangalore Refinery & Petrochemicals', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'NATIONALUM', name: 'National Aluminium Company Ltd', sector: 'Metals', exchange: 'BOTH' },
  { symbol: 'NBCC', name: 'NBCC (India) Ltd', sector: 'Infrastructure', exchange: 'BOTH' },
  { symbol: 'NHPC', name: 'NHPC Ltd', sector: 'Power', exchange: 'BOTH' },
  { symbol: 'NMDC', name: 'NMDC Ltd', sector: 'Mining', exchange: 'BOTH' },
  { symbol: 'NTPC', name: 'NTPC Ltd', sector: 'Power', exchange: 'BOTH' },
  { symbol: 'OIL', name: 'Oil India Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation Ltd', sector: 'Oil & Gas', exchange: 'BOTH' },
  { symbol: 'PFC', name: 'Power Finance Corporation Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation of India', sector: 'Power', exchange: 'BOTH' },
  { symbol: 'RECLTD', name: 'REC Ltd', sector: 'NBFC', exchange: 'BOTH' },
  { symbol: 'RVNL', name: 'Rail Vikas Nigam Ltd', sector: 'Infrastructure', exchange: 'BOTH' },
  { symbol: 'SAIL', name: 'Steel Authority of India Ltd', sector: 'Metals', exchange: 'BOTH' },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', exchange: 'BOTH' },
  { symbol: 'SJVN', name: 'SJVN Ltd', sector: 'Power', exchange: 'BOTH' },
];

// Combine all stocks into one array
export const ALL_INDIAN_STOCKS: StockInfo[] = [
  ...NIFTY_50,
  ...NIFTY_NEXT_50,
  ...MID_CAP_STOCKS,
  ...SMALL_CAP_STOCKS,
  ...OTHER_STOCKS,
  ...PSU_STOCKS,
];

// Remove duplicates based on symbol
const uniqueStocksMap = new Map<string, StockInfo>();
ALL_INDIAN_STOCKS.forEach(stock => {
  if (!uniqueStocksMap.has(stock.symbol)) {
    uniqueStocksMap.set(stock.symbol, stock);
  }
});

export const UNIQUE_INDIAN_STOCKS: StockInfo[] = Array.from(uniqueStocksMap.values());

// Just the symbols for quick lookup
export const ALL_STOCK_SYMBOLS: string[] = UNIQUE_INDIAN_STOCKS.map(s => s.symbol);

// Search function
export function searchStocks(query: string, limit: number = 20): StockInfo[] {
  const lowerQuery = query.toLowerCase();
  return UNIQUE_INDIAN_STOCKS
    .filter(stock => 
      stock.symbol.toLowerCase().includes(lowerQuery) ||
      stock.name.toLowerCase().includes(lowerQuery) ||
      stock.sector.toLowerCase().includes(lowerQuery)
    )
    .slice(0, limit);
}

// Get stocks by sector
export function getStocksBySector(sector: string): StockInfo[] {
  return UNIQUE_INDIAN_STOCKS.filter(stock => 
    stock.sector.toLowerCase() === sector.toLowerCase()
  );
}

// Get all sectors
export function getAllSectors(): string[] {
  const sectors = new Set(UNIQUE_INDIAN_STOCKS.map(s => s.sector));
  return Array.from(sectors).sort();
}

export default UNIQUE_INDIAN_STOCKS;
