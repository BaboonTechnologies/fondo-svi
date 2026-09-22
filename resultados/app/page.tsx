import factsheetData from '@/content/factsheet.json';
import { Header } from '@/components/factsheet/Header';
import { RiskScale } from '@/components/factsheet/RiskScale';
import { TwoColumnIntro } from '@/components/factsheet/TwoColumnIntro';
// import { TopFiveHoldings } from '@/components/factsheet/TopFiveHoldings';
// import { TopHoldings } from '@/components/factsheet/TopHoldings';
// import { QuarterlyReturnsTable } from '@/components/factsheet/QuarterlyReturnsTable';
import { FundFeatures } from '@/components/factsheet/FundFeatures';
// import { DonutChartCard } from '@/components/factsheet/DonutChartCard';
import { DistributorTable } from '@/components/factsheet/DistributorTable';
import { TextSection } from '@/components/factsheet/TextSection';
import { Footer } from '@/components/factsheet/Footer';
import { HistoricalBacktesting } from '@/components/factsheet/HistoricalBacktesting';
// import { HistoricalBenchmark } from '@/components/factsheet/HistoricalBenchmark';
import { LiveQuoteCard } from '@/components/factsheet/LiveQuoteCard';
import { ReportsArchive } from '@/components/factsheet/ReportsArchive';
// import { MetricsCards } from '@/components/factsheet/MetricsCards';
import { ComparisonTables } from '@/components/factsheet/ComparisonTables';
import { BuffettStatsSection } from '@/components/factsheet/BuffettStatsSection';
import { TrackRecordSection } from '@/components/factsheet/TrackRecordSection';
import { CurrentInvestments } from '@/components/factsheet/CurrentInvestments';
import { ContactSection } from '@/components/factsheet/ContactSection';
// import { DiversificationGrid } from '@/components/factsheet/DiversificationGrid';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10 md:py-12">
        <div className="mb-6 flex justify-end animate-fadeIn">
          <a href="https://reports.svinvesting.com/ultimo-reporte" target="_blank" rel="noopener noreferrer">
            <Button className="h-auto max-w-full whitespace-normal px-5 py-4 text-sm sm:px-8 sm:text-base font-semibold text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl" style={{ backgroundColor: 'var(--svi-primary)' }}>
              <Download className="mr-2 h-5 w-5" />
              Descarga Reporte Completo (PDF)
            </Button>
          </a>
        </div>

        <div className="animate-scaleIn animate-delay-100">
          <LiveQuoteCard ticker={factsheetData.yahooTicker} />
        </div>

        <div className="mt-8">
          <div className="animate-fadeIn animate-delay-200">
            <Header
              month={factsheetData.month}
              year={factsheetData.year}
              title={factsheetData.title}
              subtitle={factsheetData.subtitle}
            />
          </div>

          <div className="animate-slideInLeft animate-delay-300">
            <RiskScale level={factsheetData.riskLevel} ticker={factsheetData.yahooTicker} />
          </div>

          <div className="animate-fadeIn animate-delay-350">
            <ReportsArchive />
          </div>

          <div className="animate-fadeIn animate-delay-400">
            <TwoColumnIntro
              description={factsheetData.description}
              investmentObjective={factsheetData.investmentObjective}
            />
          </div>

          {/* <div className="animate-fadeIn animate-delay-500">
            <TopFiveHoldings />
          </div> */}


          {/* <div className="animate-scaleIn animate-delay-550">
            <QuarterlyReturnsTable returns={factsheetData.quarterlyReturns} />
          </div> */}

          <div className="animate-fadeIn animate-delay-500">
            <FundFeatures
              featuresLeft={factsheetData.fundFeaturesLeft}
              featuresRight={factsheetData.fundFeaturesRight}
            />
          </div>
        </div>

        <div className="border-t-4 mt-12 pt-12 animate-fadeIn" style={{ borderColor: 'var(--svi-light-gray)' }}>
          {/* <div className="animate-scaleIn animate-delay-100">
            <DonutChartCard
              title="Inversiones por Sector"
              data={factsheetData.sectorAllocation}
            />
          </div> */}

          <div className="animate-slideInLeft animate-delay-150">
            <DistributorTable info={factsheetData.distributorInfo} />
          </div>

          <div className="animate-fadeIn animate-delay-175">
            <TrackRecordSection />
          </div>

          <div className="animate-fadeIn animate-delay-175">
            <CurrentInvestments />
          </div>

          <div className="animate-fadeIn animate-delay-175">
            <HistoricalBacktesting />
          </div>

          <div className="animate-fadeIn animate-delay-175">
            <BuffettStatsSection />
          </div>

          {/* <div className="animate-fadeIn animate-delay-200">
            <HistoricalBenchmark />
          </div> */}

          {/* <div className="animate-fadeIn animate-delay-225">
            <MetricsCards />
          </div> */}

          {/* <div className="animate-fadeIn animate-delay-230 py-12">
            <h2 className="text-3xl font-bold mb-8" style={{ color: 'var(--svi-primary)' }}>
              Holdings del fondo
            </h2>
            <div className="flex justify-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden" style={{ minHeight: '600px' }}>
              <img
                src="/holdings.png"
                alt="Holdings del fondo"
                className="w-auto h-auto max-w-full object-contain"
              />
            </div>
          </div> */}

          <div className="animate-fadeIn animate-delay-235">
            <ComparisonTables />
          </div>

          <div className="animate-fadeIn animate-delay-240 mt-12">
            <ContactSection />
          </div>

          <div className="animate-fadeIn animate-delay-240 mt-12">
            <img
              src="/deck/david-svi-banner.jpg"
              alt="David Sánchez Molina - Systematic Value Investing"
              className="w-full h-auto rounded-xl shadow-lg"
            />
          </div>

          {/* <div className="animate-fadeIn animate-delay-237">
            <DiversificationGrid />
          </div> */}

          {/* <div className="animate-fadeIn animate-delay-238 py-12">
            <h2 className="text-3xl font-bold mb-8" style={{ color: 'var(--svi-primary)' }}>
              Cartera del SVI - S&amp;P500
            </h2>
            <div className="flex justify-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden" style={{ minHeight: '400px' }}>
              <img
                src="/cartera.png"
                alt="Cartera del SVI - S&P500"
                className="w-auto h-auto max-w-full object-contain"
              />
            </div>
          </div> */}

          {/* <div className="animate-fadeIn animate-delay-240">
            <TextSection
              title={factsheetData.monthlyUpdate.title}
              paragraphs={factsheetData.monthlyUpdate.paragraphs}
            />
          </div> */}
        </div>

        <div className="border-t-4 mt-12 pt-12 animate-fadeIn" style={{ borderColor: 'var(--svi-light-gray)' }}>
          {/* <div className="animate-slideInRight animate-delay-100">
            <TextSection
              title={factsheetData.importantInfo.title}
              paragraphs={factsheetData.importantInfo.paragraphs}
            />
          </div> */}

          <div className="animate-fadeIn animate-delay-200">
            <Footer line1={factsheetData.footer.line1} line2={factsheetData.footer.line2} />
          </div>
        </div>

        <div className="mt-8 text-center animate-fadeIn animate-delay-300">
          <a href="https://reports.svinvesting.com/ultimo-reporte" target="_blank" rel="noopener noreferrer">
            <Button className="h-auto max-w-full whitespace-normal px-5 py-4 text-base sm:px-8 sm:text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl" style={{ backgroundColor: 'var(--svi-primary)' }}>
              <Download className="mr-2 h-6 w-6" />
              Descarga Reporte Completo (PDF)
            </Button>
          </a>
        </div>
      </div>
    </main>
  );
}
