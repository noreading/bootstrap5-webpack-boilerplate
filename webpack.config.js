import Dotenv from "dotenv-webpack"
import path from "path"
import {fileURLToPath} from 'url';
import MiniCssExtractPlugin from "mini-css-extract-plugin"
import HtmlWebpackPlugin from "html-webpack-plugin"
import CopyPlugin from "copy-webpack-plugin"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourcemaps = false;

const config = {
  // Define the entry points of our application (can be multiple for different sections of a website)
  entry: {
    main: "./src/js/main.js",
  },

  // Define the destination directory and filenames of compiled resources
  output: {
    filename: "js/[name].js",
    path: path.resolve(process.cwd(), "./public"),
    pathinfo: false,
  },

  // Define optimization settings
  optimization: {
    runtimeChunk: true,
  },

  // Define loaders
  module: {
    rules: [
      // Use babel for JS files
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'src/js'),
        use: [
          {
            loader: 'thread-loader',
            options: {
              workers: 2
            }
          },
          {
            loader: "babel-loader",
            options: {
              presets: [
                "@babel/preset-env"
              ]
            }
          }
        ],
      },
      // CSS, PostCSS, and Sass
      {
        test: /\.(scss|css)$/,
        include: path.resolve(__dirname, 'src/scss'),
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              importLoaders: 2,
              sourceMap: sourcemaps,
              url: false,
            }
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  "autoprefixer",
                ]
              }
            }
          },
          "sass-loader",
        ],
      },
      // File loader for images
      {
        test: /\.(jpg|jpeg|png|git|svg)$/i,
        include: path.resolve(__dirname, 'images'),
        type: "asset/resource",
      }
    ],
  },

  // Define used plugins
  plugins: [
    // Load .env file for environment variables in JS
    new Dotenv({
      path: "./.env"
    }),

    // Extracts CSS into separate files
    new MiniCssExtractPlugin({
      filename: "css/[name].css",
      chunkFilename: "[id].css"
    }),

    // Copy images to the public folder
    new CopyPlugin({
      patterns: [
        {
          from: "src/images",
          to: "images",
          force: false
        }
      ],
      options: {
        concurrency: 50,
      }
    }),

    // Inject styles and scripts into the HTML
    new HtmlWebpackPlugin({
      template: path.resolve(process.cwd(), "index.html")
    })
  ],

  // Configure the "webpack-dev-server" plugin
  devServer: {
    static: {
      directory: path.resolve(process.cwd(), "public")
    },
    watchFiles: [
      path.resolve(process.cwd(), "index.html")
    ],
    compress: true,
    port: process.env.PORT || 9090,
    hot: true,
  },

  // Performance configuration
  performance: {
    hints: false
  }
};

if (sourcemaps) {
  // Define development options
  config.devtool = "source-map";
}

export default config;