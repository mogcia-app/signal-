import React from "react";
import { Download, BarChart3, PieChart } from "lucide-react";

interface DataExportProps {
  isLoading: boolean;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export const DataExport: React.FC<DataExportProps> = ({ isLoading, onExportCSV, onExportPDF }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-black">データエクスポート</h2>
            <p className="text-sm text-black">分析データの出力・共有</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CSV出力 */}
        <button
          onClick={onExportCSV}
          disabled={isLoading}
          className="flex items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-medium text-blue-900 mb-1">CSV出力</h3>
            <p className="text-sm text-blue-700">生データをExcelで分析</p>
          </div>
        </button>

        {/* PDFレポート */}
        <button
          onClick={onExportPDF}
          disabled={isLoading}
          className="flex items-center justify-center p-4 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Download className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-medium text-red-900 mb-1">PDFレポート</h3>
            <p className="text-sm text-red-700">包括的な分析レポート</p>
          </div>
        </button>

        {/* 画像出力 */}
        <button className="flex items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <PieChart className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-medium text-green-900 mb-1">画像出力</h3>
            <p className="text-sm text-green-700">グラフ・チャートの保存</p>
          </div>
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-black mb-2">出力内容</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-black">
          <div>
            <h5 className="font-medium text-gray-700 mb-1">CSV出力</h5>
            <ul className="space-y-1">
              <li>• 投稿データ（タイトル、内容、ハッシュタグ）</li>
              <li>• エンゲージメント指標（いいね、コメント、シェア、リーチ）</li>
              <li>• 投稿日時・タイプ情報</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-gray-700 mb-1">PDFレポート</h5>
            <ul className="space-y-1">
              <li>• パフォーマンス評価・総合分析</li>
              <li>• グラフ・チャート（エンゲージメント推移等）</li>
              <li>• AI予測・改善提案</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
